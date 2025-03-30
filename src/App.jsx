import Header from '../frontend/Header';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="content-wrapper">
          <h1>Добро пожаловать в GameHub!</h1>
          <div className="game-grid">
            <h2>Cyberpunk 2077</h2>
            <p>Футуристический RPG-экшен</p>
          </div>
          <div className="game-card">
            <h2>The Witcher 3</h2>
            <p>Эпическое фэнтези</p>
          </div>
          <div className="game-card">
            <h2>Elden Ring</h2>
            <p>Открытый мир в стиле Dark Souls</p>
            </div>
        </div>
      </main>
    </div>
  );
}