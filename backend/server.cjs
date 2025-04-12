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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint для поиска игр по названию
app.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Name parameter is required' });
    }

    const { rows } = await pool.query(
      `
      SELECT 
        name,
        reviews,
        release_date,
        header_image,
        price
      FROM games
      WHERE name ILIKE $1
      ORDER BY name
      LIMIT 50
      `,
      [`%${name}%`]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Новый endpoint для фильтрации игр
app.get('/api/games/filter', async (req, res) => {
  try {
    const { priceType, name } = req.query;
    
    let query = `
      SELECT 
        name,
        reviews,
        release_date,
        header_image,
        price
      FROM games
    `;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Добавляем условие поиска по названию
    if (name) {
      conditions.push(`name ILIKE $${paramIndex++}`);
      params.push(`%${name}%`);
    }

    // Добавляем условие фильтрации по цене
    if (priceType) {
      switch(priceType) {
        case 'free':
          conditions.push(`price = 0`);
          break;
        case 'any':
          // Без фильтрации по цене
          break;
        default:
          // Фильтр "до X руб"
          const maxPrice = parseFloat(priceType);
          if (!isNaN(maxPrice)) {
            conditions.push(`price <= $${paramIndex++}`);
            params.push(maxPrice);
          }
      }
    }
    
    // Комбинируем условия
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Сортируем и ограничиваем количество результатов
    query += ' ORDER BY release_date DESC LIMIT 50';
    
    // Выполняем запрос с параметрами
    const { rows } = await pool.query(query, params);
    res.json(rows);
    
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Запуск сервера
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});