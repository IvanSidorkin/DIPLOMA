import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './AuthPage.css';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/profile');
  }, [user, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();

    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setError('');

    let hasError = false;

    if (username.length < 3 || username.length > 20) {
      setUsernameError('Имя должно содержать от 3 до 20 символов');
      hasError = true;
    }

    if (email.length > 50) {
      setEmailError('Email слишком длинный');
      hasError = true;
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,30}$/;
    if (!passwordRegex.test(password)) {
      setPasswordError('Пароль должен содержать: 6-30 символов, минимум 1 цифру и 1 спецсимвол');
      hasError = true;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError("Необходимо согласиться с условиями соглашения и политикой конфиденциальности");
      return;
    }

    if (hasError) return;

    const result = await register(email, password, username);
    if (result.success) {
      navigate('/profile');
    } else {
      setError(result.error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setEmailError('');
    setPasswordError('');
    setError('');

    if (!email) {
      setEmailError('Введите email');
      return;
    }

    if (!password) {
      setPasswordError('Введите пароль');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/profile');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('login');
            setError('');
            setEmailError('');
            setPasswordError('');
          }}
        >
          Вход
        </button>
        <button
          className={`tab ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('register');
            setError('');
            setUsernameError('');
            setEmailError('');
            setPasswordError('');
          }}
        >
          Регистрация
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'login' ? (
        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`Pinput ${emailError ? 'input-error' : ''}`}
          />
          {emailError && <div className="field-error">{emailError}</div>}

          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`Pinput ${passwordError ? 'input-error' : ''}`}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <VisibilityIcon className='vis-icon' /> : <VisibilityOffIcon className='vis-icon' />}
            </button>
          </div>
          {passwordError && <div className="field-error">{passwordError}</div>}

          <button type="submit">Войти</button>
          <div className="auth-footer">
            <Link to="/forgot-password">Забыли пароль?</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="auth-form">
          <input
            type="text"
            placeholder="Имя пользователя (3-20 символов)"
            value={username}
            onChange={(e) => {
              if (e.target.value.length <= 20) {
                setUsername(e.target.value);
              }
            }}
            required
            className={`Pinput ${usernameError ? 'input-error' : ''}`}
          />
          {usernameError && <div className="field-error">{usernameError}</div>}

          <input
            type="email"
            placeholder="Email (макс. 50 символов)"
            value={email}
            onChange={(e) => {
              if (e.target.value.length <= 50) {
                setEmail(e.target.value);
              }
            }}
            required
            className={`Pinput ${emailError ? 'input-error' : ''}`}
          />
          {emailError && <div className="field-error">{emailError}</div>}

          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Пароль (6-30 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`Pinput ${passwordError ? 'input-error' : ''}`}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <VisibilityIcon className='vis-icon' /> : <VisibilityOffIcon className='vis-icon' />}
            </button>
          </div>
          {passwordError && <div className="field-error">{passwordError}</div>}
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={() => setAgreeTerms(!agreeTerms)}
              />
              Я принимаю <Link to="/terms" target="_blank">Пользовательское соглашение</Link>
            </label>
            <label>
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={() => setAgreePrivacy(!agreePrivacy)}
              />
              Я согласен с <Link to="/privacy" target="_blank">Политикой конфиденциальности</Link>
            </label>
          </div>

          <button type="submit">Зарегистрироваться</button>
        </form>
      )}
    </div>
  );
}
