import Header from '../frontend/Header';
import './App.css';
import GameCard from '../frontend/GameCard';



export default function App() {
  
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="content-wrapper">
          <h1>Добро пожаловать в GameHub!</h1>
          <div className="game-grid">
          <GameCard 
              imageUrl="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg?t=1731252354"
              title="Terraria"
              reviews="1% из 1,109,157 обзоров положительные"
              releaseDate="16 мая. 2011 г."
            />
                      <GameCard 
              imageUrl="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg?t=1731252354"
              title="Terraria"
              reviews="1% из 1,109,157 обзоров положительные"
              releaseDate="16 мая. 2011 г."
            />
                      <GameCard 
              imageUrl="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg?t=1731252354"
              title="Terraria"
              reviews="1% из 1,109,157 обзоров положительные"
              releaseDate="16 мая. 2011 г."
            />
                      <GameCard 
              imageUrl="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg?t=1731252354"
              title="Terraria"
              reviews="50% из 1,109,157 обзоров положительные"
              releaseDate="16 мая. 2011 г."
            />
                      <GameCard 
              imageUrl="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg?t=1731252354"
              title="Terraria"
              reviews="100% из 1,109,157 обзоров положительные"
              releaseDate="16 мая. 2011 г."
            />
            
          </div>

        </div>
      </main>
    </div>
  );
}