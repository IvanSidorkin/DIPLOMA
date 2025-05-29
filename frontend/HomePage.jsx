import Header from './Header';
import './HomePage.css';
import GameCard from '../frontend/GameCard';
import { useState, useEffect } from 'react';

export default function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({
    min: 0,
    max: 1950,
    currentMax: 1950
  });
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [visibleTagsCount, setVisibleTagsCount] = useState(5);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const formatPrice = (price) => {
    if (price > 1800) {
      return "Любая цена";
    }
    if (price === 0) {
      return "Бесплатно";
    }
    return `До ${new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(price)}`;
  };

const filteredTags = [

  ...selectedTags.filter(tag => 
    tags.includes(tag) 
  ),
  ...tags.filter(tag => 
    !selectedTags.includes(tag) && 
    tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
  )
];

const showMoreTags = () => {
  setVisibleTagsCount(prev => prev + 20);
};

const handleTagToggle = (tag) => {
  setSelectedTags(prev => 
    prev.includes(tag) 
      ? prev.filter(t => t !== tag) 
      : [...prev, tag]
  );
};

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        const response = await fetch('http://localhost:5000/api/tags');
        if (!response.ok) throw new Error('Ошибка загрузки тегов');
        const data = await response.json();
        setTags(data);
      } catch (error) {
        console.error('Ошибка загрузки тегов:', error);
      } finally {
        setTagsLoading(false);
      }
    };

    fetchTags();
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const useSearchEndpoint = searchQuery || selectedTags.length > 0 || priceRange.currentMax !== 1950;
      
      const url = new URL(
        useSearchEndpoint 
          ? 'http://localhost:5000/search'
          : 'http://localhost:5000/api/games'
      );
      if (useSearchEndpoint) {
        if (searchQuery) {
          url.searchParams.append('name', searchQuery);
        }
        
        if (priceRange.currentMax !== null && priceRange.currentMax !== undefined) {
          url.searchParams.append('maxPrice', priceRange.currentMax);
        }
        
        if (selectedTags.length > 0) {
          url.searchParams.append('tags', selectedTags.join(','));
        }
      }
        const response = await fetch(url.toString());
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
  }, [searchQuery, priceRange.currentMax, selectedTags]);
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
                      id={game.id}
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
                  <div className="tags-filter">
                  <h4>Теги</h4>
                  <input
                    type="text"
                    placeholder="Поиск тегов..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="tag-search-input"
                  />
                  {tagsLoading ? (
                    <p>Загрузка тегов...</p>
                  ) : filteredTags.length > 0 ? (
                    <>
                      <div className="tags-container">
                        {filteredTags.slice(0, visibleTagsCount).map(tag => (
                          <label key={tag} className={`tag-checkbox ${selectedTags.includes(tag) ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedTags.includes(tag)}
                              onChange={() => handleTagToggle(tag)}
                            />
                            <span className="tag-icon">
                              {selectedTags.includes(tag) ? (
                                <span className="minus-icon">−</span>
                              ) : (
                                "+"
                              )}
                            </span>
                            {tag}
                          </label>
                        ))}
                      </div>
                      {visibleTagsCount < filteredTags.length && (
                        <button onClick={showMoreTags} className="show-more-tags">
                          Показать еще
                        </button>
                      )}
                    </>
                  ) : (
                    <p>Теги не найдены</p>
                  )}
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