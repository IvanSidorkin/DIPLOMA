const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

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
const JWT_SECRET = '3a7d8f1e2c9b5a6d4e8f0a3b2c1d5e7f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4'; // Должен совпадать с тем, что используется в auth

function authenticateToken(req, res, next) {
  // 1. Проверяем токен в разных местах
  const token = 
    req.headers['authorization']?.split(' ')[1] || // Bearer Token
    req.cookies?.token ||                         // Из куков
    req.query?.token;                             // Из URL параметров

  // 2. Если токена нет
  if (!token) {
    return res.status(401).json({ 
      error: 'Токен доступа не предоставлен',
      hints: [
        'Добавьте заголовок: Authorization: Bearer YOUR_TOKEN',
        'Или передайте токен в куках или query-параметре'
      ]
    });
  }

  // 3. Проверяем токен
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Ошибка верификации токена:', err);
      return res.status(403).json({ 
        error: 'Недействительный токен',
        details: err.message
      });
    }
    
    req.user = user;
    next();
  });
}
// API endpoint для получения списка игр
app.get('/api/games', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
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

// Эндпоинт для получения данных конкретной игры по ID
app.get('/api/games/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // Проверяем, что ID - число
    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'Неверный ID игры' });
    }

    const { rows } = await pool.query(`
      SELECT 
        id,
        name,
        description,
        reviews,
        release_date,
        dev AS developers,
        pub AS publishers,
        tags,
        price,
        scroll_imgs AS screenshots,
        header_image,
        steam_url,
        min_sys,
        rec_sys
      FROM games
      WHERE id = $1
    `, [gameId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Игра не найдена' });
    }

    const game = rows[0];
    
    // Форматируем данные для ответа
    const responseData = {
      id: game.id,
      name: game.name,
      description: game.description,
      reviews: game.reviews,
      release_date: game.release_date,
      developers: game.developers,
      publishers: game.publishers,
      tags: game.tags || [],
      price: game.price,
      screenshots: game.screenshots || [],
      header_image: game.header_image,
      steam_url: game.steam_url,
      min_sys: game.min_sys || [],
      rec_sys: game.rec_sys || []
    };

    res.json(responseData);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
        id
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
    
    const token = jwt.sign({ userId: result.rows[0].user_id }, JWT_SECRET, { expiresIn: '1h' });
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

    const token = jwt.sign(
      { 
        userId: user.rows[0].user_id,
        email: user.rows[0].email,
        username: user.rows[0].username
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
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

// Новый эндпоинт для скачивания EXE
app.get('/download-exe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Проверяем существование пользователя
    const userCheck = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Путь к шаблону EXE-файла
    const exePath = path.join(__dirname, 'PC_Info.exe');
    
    // Читаем и модифицируем EXE
    let exeContent = fs.readFileSync(exePath, 'binary');
    exeContent = exeContent.replace('%USER_ID%', userId.toString());

    // Отправляем файл
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=PC_Info.exe');
    res.send(exeContent);

  } catch (err) {
    console.error('Download EXE error:', err);
    res.status(500).json({ error: 'Ошибка при подготовке файла' });
  }
});

app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(`
      SELECT user_id, email, username 
      FROM users 
      WHERE user_id = $1
    `, [req.user.userId]);
    
    res.json(user.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});