import './Header.css';
import { Link } from 'react-router-dom'; 
export default function Header() {
  return (
    <header className="header">
      <div className="logo"><Link to="/" className="logo">GameHub</Link></div>
      <nav>
        <ul className="nav-list">
          <li><Link to="/">Главная</Link></li>
          <li><Link to="/login">Вход</Link></li>
          <li><Link to="/profile">Личный кабинет</Link></li>
        </ul>
      </nav>
    </header>
  );
}