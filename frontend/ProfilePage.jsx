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
  const [editingPcId, setEditingPcId] = useState(null);
  const [newComputerName, setNewComputerName] = useState('');
  const [verificationCode, setVerificationCode] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const validateTokenAndLoad = async () => {
      try {
        const response = await fetch('http://localhost:5000/validate-token', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Токен недействителен');

        const profileRes = await fetch('http://localhost:5000/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await profileRes.json();
        setProfile(data);
        fetchComputers();
      } catch (err) {
        console.error('Token error:', err);
        logout();
      }
    };
    validateTokenAndLoad();
  }, []);

const generateCode = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/generate-code', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Ошибка генерации');
      return;
    }

    setVerificationCode(data.code);
    setCooldown(60); // 2 минуты
  } catch (err) {
    console.error('Ошибка генерации кода:', err);
    alert('Ошибка сервера');
  }
};
useEffect(() => {
  if (cooldown === 0) return;
  const interval = setInterval(() => {
    setCooldown((c) => (c > 0 ? c - 1 : 0));
  }, 1000);
  return () => clearInterval(interval);
}, [cooldown]);


  const fetchComputers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/computers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUserComputers(data);
    } catch (err) {
      console.error('Ошибка загрузки ПК:', err);
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
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserComputers((prev) => prev.filter((pc) => pc.computer_id !== computerId));
    } catch (err) {
      console.error('Ошибка удаления ПК:', err);
    }
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

  const startEditingPcName = (pc) => {
    setEditingPcId(pc.computer_id);
    setNewComputerName(pc.computer_name || '');
  };

  const cancelEditingPcName = () => {
    setEditingPcId(null);
    setNewComputerName('');
  };

  const savePcName = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/computers/${id}/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({ computer_name: newComputerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка обновления имени ПК');

      setUserComputers((prev) =>
        prev.map((pc) =>
          pc.computer_id === id ? { ...pc, computer_name: data.computer_name } : pc
        )
      );
      cancelEditingPcName();
    } catch (err) {
      console.error('Ошибка сохранения имени ПК:', err);
      alert(err.message || 'Ошибка сервера');
    }
  };

  const handleDownloadFull = async () => {
    setIsOpen(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/download-wpf', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Ошибка загрузки');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PCINFO.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Ошибка скачивания');
    }
  };

    const handleDownloadLite = async () => {
      setIsOpen(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/download-exe', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Ошибка загрузки');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PCINFO_Console.exe';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Ошибка скачивания');
    }
  };

  const copyToClipboard = (text) => {
  if (!text) return;
  navigator.clipboard.writeText(text)
    .catch(() => alert('Ошибка при копировании'));
  };


  const formatDate = (rawDate) => {
    const d = new Date(rawDate);
    return isNaN(d) ? '—' : d.toLocaleDateString('ru-RU');
  };

  if (loading) return <div className="profile-container"><p>Загрузка...</p></div>;
  if (!user) return <div className="profile-container"><h2>Пожалуйста, войдите в систему</h2></div>;

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
                        <button onClick={() => setEditingName(true)} className="edit-icon-btn hidden-edit">
                          <EditIcon className="edit-icon" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="label">Email</td>
                <td className="left" colSpan="2">{user.email}</td>
              </tr>
              <tr>
                <td className="label">Дата регистрации</td>
                <td className="left" colSpan="2">{profile?.created_at ? formatDate(profile.created_at) : 'Загрузка...'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="profile-section">
          <h3>Добавление ПК</h3>
          <button 
            onClick={generateCode} 
            disabled={cooldown > 0} 
            className="code-btn"
          >
            {cooldown > 0 ? `Подождите ${cooldown} сек.` : 'Показать код'}
          </button>
          {verificationCode && (
            <div className="code-output">
              <span className="code-label">Ваш код:</span>
              <div className="code-boxes">
                {verificationCode?.split('').map((digit, index) => (
                  <div className="code-box" key={index}>
                    {digit}
                  </div>
                ))}
              <button onClick={() => copyToClipboard(verificationCode)} className="copy-code-btn" title="Копировать">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="black">
                <path d="M208 0L332.1 0c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9L448 336c0 26.5-21.5 48-48 48l-192 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48zM48 128l80 0 0 64-64 0 0 256 192 0 0-32 64 0 0 48c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 176c0-26.5 21.5-48 48-48z"/>
                </svg>
              </button>
              </div>
              <p className="code-timer-note">Действует 1 минуту</p>
            </div>
          )}
        </div>            
        <div className="profile-section">
        <div className="section-header">
          <div className="dropdown">
            <button className="code-btn dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
              Скачать программу
            </button>
            {isOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={handleDownloadFull}>
                  Скачать полную версию
                </button>
                <button className="dropdown-item" onClick={handleDownloadLite}>
                  Скачать упрощенную версию
                </button>
              </div>
            )}
          </div>
          <h3>Конфигурации компьютеров</h3>
        </div>
          {userComputers.length === 0 ? (
            <p>Нет сохранённых конфигураций</p>
          ) : (
            userComputers.map((pc) => (
              <div key={pc.computer_id} className="pc-config-display">
                <div className="pc-name-edit-row">
                  {editingPcId === pc.computer_id ? (
                    <>
                      <input
                        value={newComputerName}
                        onChange={(e) => setNewComputerName(e.target.value)}
                        className="pc-name-input"
                      />
                      <button onClick={() => savePcName(pc.computer_id)} className="save-btn">Сохранить</button>
                      <button onClick={cancelEditingPcName} className="cancel-btn">Отмена</button>
                    </>
                  ) : (
                    <div className="pc-name-view">
                      <h4>{pc.computer_name || 'Без названия'}</h4>
                      <button onClick={() => startEditingPcName(pc)} className="edit-icon-btn hidden-edit">
                        <EditIcon className="edit-icon" />
                      </button>
                    </div>
                  )}
                </div>

                <table className="pc-config-table">
                  <tbody>
                    <tr><td className="label">Процессор</td><td>{pc.cpu_name || 'Не указан'}</td></tr>
                    <tr><td className="label">Видеокарта</td><td>{pc.gpu_name || 'Не указана'}</td></tr>
                    <tr><td className="label">ОЗУ</td><td>{pc.total_ram_gb ? `${pc.total_ram_gb} GB` : 'Не указано'}</td></tr>
                    <tr><td className="label">DirectX</td><td>{pc.directx_version || 'N/A'}</td></tr>
                    <tr><td className="label">Windows</td><td>{pc.windows_version || 'N/A'} (Build {pc.windows_build || 'N/A'})</td></tr>
                    <tr><td className="label">Архитектура</td><td>{pc.architecture_os || 'N/A'}</td></tr>
                  </tbody>
                </table>
                <button onClick={() => deleteComputer(pc.computer_id)} className="delete-btn">Удалить</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
