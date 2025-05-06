import { useAuth } from './AuthContext';
import { useEffect, useState } from 'react';
import './ProfilePage.css';
import Header from './Header';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [pcConfig, setPcConfig] = useState({
    cpu: '',
    gpu: '',
    ram: '',
    storage: ''
  });
  const [games, setGames] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // Загрузка данных при монтировании
  useEffect(() => {
    if (user) {
      // Загрузка сохранённой конфигурации (из localStorage или API)
      const savedConfig = localStorage.getItem(`pcConfig_${user.id}`);
      if (savedConfig) {
        setPcConfig(JSON.parse(savedConfig));
      }

      // Загрузка игр пользователя (заглушка)
      setGames([
        { id: 1, name: 'Cyberpunk 2077', playtime: 56 },
        { id: 2, name: 'Elden Ring', playtime: 112 }
      ]);
    }
  }, [user]);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setPcConfig(prev => ({ ...prev, [name]: value }));
  };

  const saveConfig = () => {
    localStorage.setItem(`pcConfig_${user.id}`, JSON.stringify(pcConfig));
    setIsEditing(false);
    alert('Конфигурация сохранена!');
  };

  if (!user) {
    return (
      <div className="profile-container">
        <h2>Пожалуйста, войдите в систему</h2>
      </div>
    );
  }

  return (
    <div>
      <Header/>
    <div className="profile-container">
      <div className="profile-header">
        <h2>Профиль пользователя</h2>
        <button onClick={logout} className="logout-btn">Выйти</button>
      </div>

      <div className="profile-section">
        <h3>Основная информация</h3>
        <div className="user-info">
          <p><strong>Никнейм:</strong> {user.username || 'Не указан'}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Дата регистрации:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="profile-section">
        <div className="section-header">
          <h3>Конфигурация компьютера</h3>
          {isEditing ? (
            <button onClick={saveConfig} className="save-btn">Сохранить</button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="edit-btn">Редактировать</button>
          )}
        </div>

        {isEditing ? (
          <div className="pc-config-form">
            <div className="form-group">
              <label>Процессор (CPU):</label>
              <input
                type="text"
                name="cpu"
                value={pcConfig.cpu}
                onChange={handleConfigChange}
                placeholder="Например: Intel Core i7-12700K"
              />
            </div>
            <div className="form-group">
              <label>Видеокарта (GPU):</label>
              <input
                type="text"
                name="gpu"
                value={pcConfig.gpu}
                onChange={handleConfigChange}
                placeholder="Например: NVIDIA RTX 3080"
              />
            </div>
            <div className="form-group">
              <label>Оперативная память (RAM):</label>
              <input
                type="text"
                name="ram"
                value={pcConfig.ram}
                onChange={handleConfigChange}
                placeholder="Например: 32GB DDR4"
              />
            </div>
            <div className="form-group">
              <label>Накопитель:</label>
              <input
                type="text"
                name="storage"
                value={pcConfig.storage}
                onChange={handleConfigChange}
                placeholder="Например: 1TB NVMe SSD"
              />
            </div>
          </div>
        ) : (
          <div className="pc-config-display">
            {pcConfig.cpu || pcConfig.gpu ? (
              <ul>
                <li><strong>CPU:</strong> {pcConfig.cpu || 'Не указан'}</li>
                <li><strong>GPU:</strong> {pcConfig.gpu || 'Не указан'}</li>
                <li><strong>RAM:</strong> {pcConfig.ram || 'Не указан'}</li>
                <li><strong>Storage:</strong> {pcConfig.storage || 'Не указан'}</li>
              </ul>
            ) : (
              <p>Конфигурация не указана</p>
            )}
          </div>
        )}
      </div>

      <div className="profile-section">
        <h3>Мои игры</h3>
        {games.length > 0 ? (
          <div className="games-list">
            {games.map(game => (
              <div key={game.id} className="game-card">
                <div className="game-info">
                  <h4>{game.name}</h4>
                  <p>Наиграно: {game.playtime} часов</p>
                </div>
                <button className="details-btn">Подробнее</button>
              </div>
            ))}
          </div>
        ) : (
          <p>У вас пока нет игр в коллекции</p>
        )}
      </div>

      <div className="profile-section">
        <h3>Рекомендации</h3>
        <div className="recommendations">
          {pcConfig.gpu && (
            <div className="recommendation-card">
              <h4>Оптимальные настройки графики</h4>
              <p>Для вашей {pcConfig.gpu} рекомендуем:</p>
              <ul>
                <li>Разрешение: 1440p</li>
                <li>Качество текстур: Ультра</li>
                <li>Трассировка лучей: Включено</li>
              </ul>
            </div>
          )}
          <div className="recommendation-card">
            <h4>Сообщество</h4>
            <p>Присоединяйтесь к другим игрокам с похожей конфигурацией!</p>
            <button className="community-btn">Показать</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}