import Header from '../frontend/Header';
import './App.css';
import GameCard from '../frontend/GameCard';
import { useState, useEffect } from 'react';

export default function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({
    min: 0,
    max: 1950, // Максимальная цена по умолчанию
    currentMax: 1950 // Текущее значение слайдера
  });

  // Функция для форматирования цены
  const formatPrice = (price) => {
    if (price > 1800) {
      return "Любая цена"
    }
    if (price === 0){
      return "Бесплатно"
    }
    return `До ${new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(price)}`;
  };

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const url = new URL(
          searchQuery 
            ? `http://localhost:5000/search`
            : 'http://localhost:5000/api/games'
        );
        
        if (searchQuery) {
          url.searchParams.append('name', searchQuery);
        }
        
        // Добавляем параметр цены
        if (priceRange.currentMax !== null && priceRange.currentMax !== undefined) {
          url.searchParams.append('maxPrice', priceRange.currentMax);
        }
        
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных');
        }
        const data = await response.json();
        setGames(data);
        
        // Обновляем максимальную цену на основе полученных данных
      } catch (error) {
        console.error('Ошибка:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [searchQuery, priceRange.currentMax]);

  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setSearchQuery(formData.get('search') || '');
  };

  const handlePriceChange = (e) => {
    setPriceRange(prev => ({
      ...prev,
      currentMax: parseInt(e.target.value)
    }));
  };
  
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="content-wrapper">
          <h1>Добро пожаловать в GameHub!</h1>
          <form onSubmit={handleSearch}>
            <input 
              className='Search' 
              placeholder='Поиск'
              name="search"
              defaultValue={searchQuery}
            />
            <button type="submit" style={{ display: 'none' }}></button>
          </form>
          <div className='pregame-grid'>
            {loading ? (
              <div>Загрузка...</div>
            ) : (
              <>
                <div className="game-grid">
                  {games.map((game) => (
                    <GameCard 
                      key={game.name}
                      imageUrl={game.header_image}
                      title={game.name}
                      reviews={game.reviews}
                      releaseDate={game.release_date}
                      price={game.price}
                    />
                  ))}
                </div>
                <div className='sortpanel'>
                  <h3>Фильтры</h3>
                  <div className="price-filter">
                    <p>{formatPrice(priceRange.currentMax)}</p>
                    <input
                      type="range"
                      min={priceRange.min}
                      max={priceRange.max}
                      value={priceRange.currentMax}
                      onChange={handlePriceChange}
                      step="150"
                      className="price-slider"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}