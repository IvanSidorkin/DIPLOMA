using System;
using System.Diagnostics;
using System.IO;
using System.Management;
using Npgsql;
using System.Collections.Generic;
using Newtonsoft.Json;

class Program
{

    private static readonly Guid USER_ID = new Guid("00000000-0000-0000-0000-000000000000");
    static void Main(string[] args)
    {
        Console.WriteLine($"Сбор данных для пользователя ID: {USER_ID}");

        var pcInfo = CollectSystemInfo();
        SaveToDatabase(pcInfo, USER_ID);

        Console.WriteLine("Информация сохранена в базу данных.");
        Console.ReadKey();
    }

    public class SystemInfo
    {
        public string CpuName { get; set; }
        public string GpuName { get; set; }
        public int TotalRamGb { get; set; }
        public List<dynamic> Disks { get; set; } = new List<dynamic>();
        public List<dynamic> NetworkAdapters { get; set; } = new List<dynamic>();
        public string DirectXVersion { get; set; }
    }

    static SystemInfo CollectSystemInfo()
    {
        var pcInfo = new SystemInfo();  

        // 1. Процессор
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                pcInfo.CpuName = obj["Name"].ToString();
                break; // берем только первый процессор
            }
        }

        // 2. Видеокарта
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_VideoController"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                pcInfo.GpuName = obj["Name"].ToString();
                break; // берем только первую видеокарту
            }
        }

        // 3. ОЗУ
        ulong totalRAM = 0;
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_PhysicalMemory"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                totalRAM += Convert.ToUInt64(obj["Capacity"]);
            }
        }
        pcInfo.TotalRamGb = (int)(totalRAM / (1024 * 1024 * 1024));

        // 4. Диски
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_LogicalDisk WHERE DriveType=3"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                pcInfo.Disks.Add(new
                {
                    DeviceID = obj["DeviceID"].ToString(),
                    VolumeName = obj["VolumeName"]?.ToString(),
                    SizeGB = Convert.ToUInt64(obj["Size"]) / (1024 * 1024 * 1024),
                    FreeSpaceGB = Convert.ToUInt64(obj["FreeSpace"]) / (1024 * 1024 * 1024)
                });
            }
        }

        // 5. Сетевое подключение
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_NetworkAdapter WHERE NetConnectionStatus=2"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                pcInfo.NetworkAdapters.Add(new
                {
                    Name = obj["Name"].ToString(),
                    ConnectionID = obj["NetConnectionID"].ToString()
                });
            }
        }

        // 6. Версия DirectX
        pcInfo.DirectXVersion = GetActualDirectXVersion();

        return pcInfo;
    }

    static void SaveToDatabase(dynamic pcInfo, Guid userId)
    {
        string connectionString = "Host=localhost;Port=5413;Username=postgres;Password=123456;Database=products";

        try
        {
            using (var conn = new NpgsqlConnection(connectionString))
            {
                conn.Open();

                string disksJson = JsonConvert.SerializeObject(pcInfo.Disks);
                string adaptersJson = JsonConvert.SerializeObject(pcInfo.NetworkAdapters);

                string sql = @"
                    INSERT INTO user_computers (
                        user_id,
                        cpu_name, 
                        gpu_name, 
                        total_ram_gb, 
                        disks, 
                        network_adapters, 
                        directx_version,
                        created_at
                    ) 
                    VALUES (
                        @UserId,
                        @CpuName, 
                        @GpuName, 
                        @TotalRamGb, 
                        @Disks::jsonb, 
                        @Adapters::jsonb, 
                        @DirectXVersion,
                        NOW()
                    )";

                using (var cmd = new NpgsqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", NpgsqlTypes.NpgsqlDbType.Uuid, userId);
                    cmd.Parameters.AddWithValue("@CpuName", pcInfo.CpuName);
                    cmd.Parameters.AddWithValue("@GpuName", pcInfo.GpuName);
                    cmd.Parameters.AddWithValue("@TotalRamGb", pcInfo.TotalRamGb);
                    cmd.Parameters.AddWithValue("@Disks", disksJson);
                    cmd.Parameters.AddWithValue("@Adapters", adaptersJson);
                    cmd.Parameters.AddWithValue("@DirectXVersion", pcInfo.DirectXVersion);

                    int rowsAffected = cmd.ExecuteNonQuery();
                    Console.WriteLine(rowsAffected > 0
                        ? "Данные успешно сохранены в БД"
                        : "Ошибка: данные не сохранены");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка при сохранении в базу данных: {ex.Message}");
        }
    }

    static string GetActualDirectXVersion()
    {
        try
        {
            // Способ 1: Проверка через dxdiag (самый надежный)
            string dxdiagOutput = GetDxDiagInfo();
            if (!string.IsNullOrEmpty(dxdiagOutput))
            {
                int dxIndex = dxdiagOutput.IndexOf("DirectX Version:");
                if (dxIndex > 0)
                {
                    string dxLine = dxdiagOutput.Substring(dxIndex, 50);
                    return dxLine.Split('\n')[0].Trim();
                }
            }

            // Способ 2: Проверка наличия d3d12.dll
            string systemPath = Environment.GetFolderPath(Environment.SpecialFolder.System);
            if (File.Exists(Path.Combine(systemPath, "d3d12.dll")))
            {
                return "DirectX 12";
            }

            // Способ 3: Проверка реестра (менее надежный)
            string regVersion = Microsoft.Win32.Registry.GetValue(
                @"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\DirectX",
                "Version",
                "")?.ToString();

            return !string.IsNullOrEmpty(regVersion) ? $"DirectX (реестр: {regVersion})" : "Неизвестно";
        }
        catch
        {
            return "Не удалось определить";
        }
    }

    static string GetDxDiagInfo()
    {
        try
        {
            string tempFile = Path.GetTempFileName();
            ProcessStartInfo psi = new ProcessStartInfo("dxdiag")
            {
                Arguments = $"/t {tempFile}",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            Process.Start(psi)?.WaitForExit(5000);

            if (File.Exists(tempFile))
            {
                string result = File.ReadAllText(tempFile);
                File.Delete(tempFile);
                return result;
            }
            return null;
        }
        catch
        {
            return null;
        }
    }
}