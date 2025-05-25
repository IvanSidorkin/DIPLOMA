import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from './Header';
import './GamePage.css';
import GameSlider from './GameSlider';

export default function GamePage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [checking, setChecking] = useState(false);


  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/games/${gameId}`);
        if (!response.ok) throw new Error('Игра не найдена');
        const data = await response.json();
        setGame(data);
      } catch (err) {
        setError(err.message);
      }
    };
    
    fetchGame();
  }, [gameId]);

  useEffect(() => {
  const checkCompatibility = async () => {
    try {
      setChecking(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      if (!token || !user) return;

      // Получаем все компьютеры пользователя
      const res = await fetch('http://localhost:5000/api/computers', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const pcs = await res.json();
      if (!pcs || pcs.length === 0) return;

      // Берем первый компьютер
      const resCheck = await fetch('http://localhost:5000/check-compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          computer_id: pcs[0].computer_id,
          game_id: gameId
        })
      });

      const data = await resCheck.json();
      setCompatibility(data.result);
    } catch (err) {
      console.error('Ошибка проверки совместимости:', err);
    } finally {
      setChecking(false);
    }
  };

  if (game) checkCompatibility();
}, [game]);

  if (error) return <div className="error">{error}</div>;
  if (!game) return <div>Игра не найдена</div>;

  return (
    <div className="game-page">
      <Header />
      <main className="game-content">
        <div className="game-header">
          <img src={game.header_image} alt={game.name} className="game-cover" />
          <div className="game-description">
            <h2>Описание</h2>
            <p>{game.description || 'Описание отсутствует'}</p>
          </div>

          <div className="game-info">
            <h1>{game.name}</h1>
            <div className="game-meta">
              <span className="price">
                {game.price == 0 ? 'Бесплатно' : `${game.price/100} ₽`}
              </span>
              <span className="release-date">
                Дата выхода: {game.release_date}
              </span>
              <span className="rating">
                Рейтинг: {game.reviews} положительных отзывов
                </span>
              {compatibility && (
                <div className="compatibility-check">
                  <h3>Подходит ли вам игра?</h3>
                  <ul>
                    <li><strong>Процессор:</strong> {compatibility.cpu}</li>
                    <li><strong>Видеокарта:</strong> {compatibility.gpu}</li>
                    <li><strong>ОЗУ:</strong> {compatibility.ram}</li>
                    <li><strong>DirectX:</strong> {compatibility.directx}</li>
                    <li><strong>Windows:</strong> {compatibility.windows}</li>
                  </ul>
                </div>
              )}

            {checking && <p>🔍 Проверяем совместимость...</p>}

            </div>
            
              <a href={game.steam_url} target="_blank" rel="noopener noreferrer" className='buy-ref'>
              <button className="buy-button">
                Купить в Steam
              </button>
              </a>
            
          </div>
        </div>
        <hr/>
        <div className="game-details-container">
        <div className="screenshots-section">
          <h2>Скриншоты</h2>
          <GameSlider scrollImgs={game.screenshots} />
        </div>
        
        <div className="tags-section">
          <h2>Теги</h2>
          <div className="tags-list">
            {game.tags?.map(tag => (
              <span key={tag} className="game-tag">{tag}</span>
            ))}
          </div>
          <div className="system-requirements-section">
    <h2>Системные требования</h2>
    <div className="requirements-grid">
      <div className="requirements-column">
        <h3>Минимальные</h3>
        <ul>
          {game.min_sys?.map((req, index) => (
            <li key={`min-${index}`}>{req}</li>
          ))}
        </ul>
      </div>
      <div className="requirements-column">
        <h3>Рекомендуемые</h3>
        <ul>
          {game.rec_sys?.map((req, index) => (
            <li key={`rec-${index}`}>{req}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>

        </div>
      </div>
      </main>
    </div>
  );
}