const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

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

// Получение уникальных тегов из всех игр
app.get('/api/tags', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        unnest(tags) as tag,
        COUNT(*) as tag_count
      FROM games 
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY tag
      ORDER BY tag_count DESC, tag ASC
    `);
    res.json(rows.map(row => row.tag));
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.get('/search', async (req, res) => {
  try {
    const { name, maxPrice, tags } = req.query;

    let query = `
      SELECT 
        name,
        reviews,
        release_date,
        header_image,
        price
      FROM games
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (name) {
      query += ` AND name ILIKE $${paramIndex++}`;
      params.push(`%${name}%`);
    }

    if (maxPrice) {
      const priceValue = maxPrice * 100;
      if (priceValue > 1800*100) {
        // Без фильтра
      } 
      else if (priceValue > 2 && priceValue <= 1800*100) {
        query += ` AND price <= $${paramIndex++}`;
        params.push(priceValue);
      }
      else if (priceValue < 1) {
        query += ` AND price < 1`;
      }
    }

    if (tags) {
      const tagArray = typeof tags === 'string' ? tags.split(',') : [];
      if (tagArray.length > 0) {
        query += ` AND (`;
        tagArray.forEach((tag, index) => {
          if (index > 0) query += ` AND `; // Изменили OR на AND для фильтрации по всем тегам
          query += `$${paramIndex++} = ANY(tags)`;
          params.push(tag.trim());
        });
        query += `)`;
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

app.post('/register', async (req, res) => {
  const { email, password, username } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING user_id, email, username`,
      [email, hashedPassword, username]
    );
    
    const token = jwt.sign({ userId: result.rows[0].user_id }, 'ваш_секретный_ключ', { expiresIn: '1h' });
    res.status(201).json({ user: result.rows[0], token });
  } catch (error) {
    if (error.code === '23505') { // Ошибка уникальности в PostgreSQL
      res.status(400).json({ error: 'Email уже занят' });
    } else {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign({ userId: user.rows[0].user_id }, 'ваш_секретный_ключ', { expiresIn: '1h' });
    res.json({ 
      user: { 
        id: user.rows[0].user_id, 
        email: user.rows[0].email,
        username: user.rows[0].username
      }, 
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});