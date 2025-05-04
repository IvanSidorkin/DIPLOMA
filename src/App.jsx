import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '../frontend/HomePage'
import LoginPage from '../frontend/AuthPage';
import AuthPage from '../frontend/AuthPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </Router>
  );
}

export default App;