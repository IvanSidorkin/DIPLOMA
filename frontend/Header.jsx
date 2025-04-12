import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="logo"><a href='' className="logo">GameHub</a></div>
      <nav>
        <ul className="nav-list">
          <li><a href="/">Главная</a></li>
          <li><a href="/games">Проверить игру</a></li>
          <li><a href="/about">Личный Кабинет</a></li>
        </ul>
      </nav>
    </header>
  );
}