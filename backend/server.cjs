const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());

// Подключение к PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'products',
  password: '123456',
  port: 5413,
});
// API endpoint для получения списка игр
app.get('/api/games', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        name,
        reviews,
        release_date,
        header_image
      FROM games
      ORDER BY release_date DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    
  }
});
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});