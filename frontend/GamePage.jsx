import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from './Header';
import './GamePage.css';

export default function GamePage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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


  if (error) return <div className="error">{error}</div>;
  if (!game) return <div>Игра не найдена</div>;

  return (
    <div className="game-page">
      <Header />
      <main className="game-content">
        <div className="game-header">
          <img src={game.header_image} alt={game.name} className="game-cover" />
          <div className="game-info">
            <h1>{game.name}</h1>
            <div className="game-meta">
              <span className="price">
                {game.price === 0 ? 'Бесплатно' : `${game.price} ₽`}
              </span>
              <span className="release-date">
                Дата выхода: {new Date(game.release_date).toLocaleDateString()}
              </span>
              <span className="rating">
                Рейтинг: {game.reviews}% положительных отзывов
              </span>
            </div>
            <button className="buy-button">
              {game.price === 0 ? 'Установить' : 'Купить'}
            </button>
          </div>
        </div>

        <div className="game-details">
          <div className="game-description">
            <h2>Описание</h2>
            <p>{game.description || 'Описание отсутствует'}</p>
          </div>

          <div className="game-screenshots">
            <h2>Скриншоты</h2>
            <div className="screenshots-grid">
              {game.screenshots?.map((screenshot, index) => (
                <img 
                  key={index} 
                  src={screenshot} 
                  alt={`Скриншот ${index + 1}`} 
                  className="screenshot"
                />
              ))}
            </div>
          </div>

          <div className="game-tags">
            <h2>Теги</h2>
            <div className="tags-list">
              {game.tags?.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}