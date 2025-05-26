import { useAuth } from './AuthContext';
import { useEffect, useState } from 'react';
import './ProfilePage.css';
import Header from './Header';
import EditIcon from '@mui/icons-material/Edit';


export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const [userComputers, setUserComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);

  useEffect(() => {
    const token = localStorage.getItem('token');

    const validateTokenAndLoad = async () => {
      try {
        const response = await fetch('http://localhost:5000/validate-token', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Токен недействителен');
      const profile = await fetch('http://localhost:5000/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await profile.json();
      setProfile(data);
      console.log('ПОЛУЧЕН ПРОФИЛЬ:', data);
        fetchComputers();
      } catch (err) {
        console.error('Token error:', err);
        logout();
      }
    };

    validateTokenAndLoad();
  }, []);

  const fetchComputers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/computers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setUserComputers(data);
    } catch (err) {
      console.error('Ошибка загрузки конфигураций ПК:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteComputer = async (computerId) => {
    if (!window.confirm('Удалить этот компьютер?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/computers/${computerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserComputers((prev) =>
        prev.filter((pc) => pc.computer_id !== computerId)
      );
    } catch (err) {
      console.error('Ошибка удаления ПК:', err);
    }
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Требуется авторизация. Пожалуйста, войдите снова.');
        logout();
        return;
      }

      const response = await fetch('http://localhost:5000/download-exe', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при скачивании');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PC_Info.exe';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert(error.message || 'Произошла ошибка при скачивании');
    }
  };

  const formatDate = (rawDate) => {
    const d = new Date(rawDate);
    return isNaN(d)
      ? '—'
      : d.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  };

  const saveUsername = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/profile/username', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });
  
      const data = await res.json();
  
      if (!res.ok) throw new Error(data.error || 'Ошибка обновления');
  
      const updatedUser = { ...user, username: data.username };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setEditingName(false);
    } catch (err) {
      console.error('Ошибка при обновлении ника:', err);
      alert(err.message || 'Ошибка сервера');
    }
  };
  
  

  if (loading) {
    return <div className="profile-container"><p>Загрузка...</p></div>;
  }
  
  if (!user) {
    return (
      <div className="profile-container">
        <h2>Пожалуйста, войдите в систему</h2>
      </div>
    );
  }
  

  return (
    <div>
      <Header />
      <div className="profile-container">
        <div className="profile-header">
          <h2>Профиль пользователя</h2>
          <button onClick={logout} className="logout-btn">Выйти</button>
        </div>

        <div className="profile-section">
  <h3>Основная информация</h3>
  <table className="pc-config-table">
    <tbody>
    <tr className="username-row">
  <td className="label">Никнейм</td>
  <td colSpan="2" className="nickname-cell">
    <div className="nickname-wrapper">
      {editingName ? (
        <>
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="username-input"
          />
          <button onClick={saveUsername} className="save-btn">Сохранить</button>
        </>
      ) : (
        <>
          <span>{user.username}</span>
          <button
            onClick={() => setEditingName(true)}
            className="edit-icon-btn hidden-edit"
          >
            <EditIcon className="edit-icon" />
          </button>
        </>
      )}
    </div>
  </td>
</tr>

      <tr>
        <td className="label">Email</td>
        <td className='left' colSpan="2">{user.email}</td>
      </tr>
      <tr>
        <td className="label">Дата регистрации</td>
        <td className='left' colSpan="2">{profile?.created_at ? formatDate(profile.created_at) : 'Загрузка...'}</td>
      </tr>
    </tbody>
  </table>
</div>



        <div className="profile-section">
          <div className="section-header">
            <button onClick={handleDownload}>Скачать программу</button>
            <h3>Конфигурации компьютеров</h3>
          </div>

          {loading ? (
            <p>Загрузка...</p>
          ) : userComputers.length === 0 ? (
            <p>Нет сохранённых конфигураций</p>
          ) : (
            userComputers.map((pc) => (
              <div key={pc.computer_id} className="pc-config-display">
<table className="pc-config-table">
  <tbody>
    <tr>
      <td className="label">Процессор</td>
      <td>{pc.cpu_name || 'Не указан'}</td>
    </tr>
    <tr>
      <td className="label">Видеокарта</td>
      <td>{pc.gpu_name || 'Не указана'}</td>
    </tr>
    <tr>
      <td className="label">Оперативная память</td>
      <td>{pc.total_ram_gb ? `${pc.total_ram_gb} GB` : 'Не указано'}</td>
    </tr>
    <tr>
      <td className="label">Хранилище</td>
      <td>
        {pc.disks && Array.isArray(pc.disks) ? (
          <ul className="disk-list-table">
            {pc.disks.map((disk, index) => (
              <li key={index}>
                {disk.DeviceID || '??'} — свободно {disk.FreeSpaceGB} GB / {disk.SizeGB} GB
              </li>
            ))}
          </ul>
        ) : (
          'Не указано'
        )}
      </td>
    </tr>
    <tr>
      <td className="label">DirectX</td>
      <td>{pc.directx_version || 'N/A'}</td>
    </tr>
    <tr>
      <td className="label">Windows</td>
      <td>{pc.windows_version || 'N/A'} (Build {pc.windows_build || 'N/A'})</td>
    </tr>
    <tr>
      <td className="label">Архитектура</td>
      <td>{pc.architecture_os || 'N/A'}</td>
    </tr>
  </tbody>
</table>
<button onClick={() => deleteComputer(pc.computer_id)} className="delete-btn">
  Удалить
</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
