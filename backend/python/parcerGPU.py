import requests
from bs4 import BeautifulSoup
import psycopg2

URL = "https://www.videocardbenchmark.net/gpu_list.php"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

# Подключение к PostgreSQL
conn = psycopg2.connect(
    host="localhost",
    database="products",
    user="postgres",
    password="123456",
    port=5413
)
cur = conn.cursor()

# Запрос и парсинг
response = requests.get(URL, headers=HEADERS)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

# Ищем строки вида id="gpuXXXX"
rows = soup.select("tr[id^=gpu]")

gpu_data = []

for row in rows:
    cols = row.find_all("td")
    if len(cols) >= 2:
        name_tag = cols[0].find("a")
        name = name_tag.text.strip() if name_tag else cols[0].text.strip()

        score = cols[1].text.strip().replace(',', '')
        if score.isdigit():
            gpu_name = name
            gpu_mark = int(score)

            # Вставка в БД
            cur.execute(
                "INSERT INTO gpu (gpu_name, gpu_mark) VALUES (%s, %s)",
                (gpu_name, gpu_mark)
            )

            gpu_data.append((gpu_name, gpu_mark))

conn.commit()
cur.close()
conn.close()

# Вывод результата
for gpu_name, gpu_mark in gpu_data:
    print(f"{gpu_name} --> {gpu_mark}")

print(f"\n✅ Всего добавлено GPU: {len(gpu_data)}")
