import './Header.css';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="logo"><Link to="/" className="logo">GameHub</Link></div>
      <nav>
        <ul className="nav-list">
          <li><Link to="/">Главная</Link></li>
          {user ? (
            <>
              <li><Link to="/profile">{user.username}</Link></li>
              <li><button onClick={logout} className="logout-btn">Выйти</button></li>
            </>
          ) : (
            <li><Link to="/login">Вход</Link></li>
          )}
        </ul>
      </nav>
    </header>
  );
}