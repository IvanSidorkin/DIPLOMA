import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Проверяем токен при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Здесь можно добавить запрос для проверки токена
      setUser({ email: localStorage.getItem('userEmail') });
    }
  }, []);

  // Регистрация (полная версия)
  const register = async (email, password, username) => {
    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации');
      }
  
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.user.email);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Логин (полная версия)
  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Неверные данные');

      const data = await response.json();
      
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', email);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Неверный email или пароль' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);