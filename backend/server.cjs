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
        header_image,
        price
      FROM games
      ORDER BY release_date DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    
  }
});

app.get('/search', async (req, res) => {
  try {
    const { name, maxPrice } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'Name parameter is required' });
    }

    let query = `
      SELECT 
        name,
        reviews,
        release_date,
        header_image,
        price
      FROM games
      WHERE name ILIKE $1
    `;

    const params = [`%${name}%`];
    let paramIndex = 2;
    const priceValue = maxPrice * 100;
    // Добавляем фильтрацию по цене
    if (priceValue !== undefined) {
        if (priceValue > 1800*100) {} 
        else if (priceValue > 2 && priceValue <= 1800*100) {
        // Фильтр по максимальной цене
        
        if (!isNaN(priceValue) && priceValue !== 0) {
          query += ` AND price <= $${paramIndex++}`;
          
          params.push(priceValue);
        }
      }
      else if (priceValue < 1) {
        // Только бесплатные игры
        query += ` AND price < 1`;
      }
    }

    query += ' ORDER BY name LIMIT 50';

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});