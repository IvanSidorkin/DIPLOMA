import Header from '../frontend/Header';
import './App.css';
import GameCard from '../frontend/GameCard';
import { useState, useEffect } from 'react';

export default function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        // Изменяем URL на /api/games
        const response = await fetch('http://localhost:5000/api/games');
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных');
        }
        const data = await response.json();
        setGames(data);
      } catch (error) {
        console.error('Ошибка:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="content-wrapper">
          <h1>Добро пожаловать в GameHub!</h1>
          {loading ? (
            <div>Загрузка...</div>
          ) : (
            <div className="game-grid">
              {games.map((game) => (
                <GameCard 

                  imageUrl={game.header_image}
                  title={game.name}
                  reviews={game.reviews}
                  releaseDate={game.release_date}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}