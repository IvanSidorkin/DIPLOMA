import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '../frontend/HomePage';
import AuthPage from '../frontend/AuthPage';
import ProfilePage from '../frontend/ProfilePage';
import GamePage from '../frontend/GamePage';
import Header from '../frontend/Header';

function App() {
  return (
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
        </Routes>
      </Router>
  );
}

export default App;