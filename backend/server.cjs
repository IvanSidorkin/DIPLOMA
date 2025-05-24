const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { verify } = require('jsonwebtoken');
const { createLogger, format, transports } = require('winston');
const logger = createLogger({
  level: 'info',
  format: format.combine(
      format.timestamp(),
      format.json()
  ),
  transports: [
      new transports.Console({
          format: format.combine(
              format.colorize(),
              format.simple()
          )
      }),
      new transports.File({ filename: 'server.log' })
  ]
});
const app = express();
app.use(cors());
app.use(express.json());
// Настройка логгера

// Подключение к PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'products',
  password: '123456',
  port: 5413,
});
// Добавьте в начало server.cjs
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || '3a7d8f1e2c9b5a6d4e8f0a3b2c1d5e7f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4',
  expiresIn: '7d',
};


// В server.cjs
app.get('/validate-token', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
    message: 'Токен действителен'
  });
});

function authenticateToken(req, res, next) {
  // 1. Получаем токен из разных источников
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
      logger.error('Токен не предоставлен', {
          headers: req.headers,
          cookies: req.cookies
      });
      return res.status(401).json({ error: 'Требуется аутентификация' });
  }

  // 2. Верифицируем токен
  jwt.verify(token, JWT_CONFIG.secret, (err, decoded) => {
      if (err) {
          logger.error('Ошибка верификации токена', {
              error: err.message,
              token: token
          });
          return res.status(403).json({ 
              error: 'Недействительный токен',
              details: err.message 
          });
      }

      // 3. Проверяем наличие обязательных полей
      if (!decoded.userId) {
          logger.error('Токен не содержит userId', { decoded });
          return res.status(403).json({ 
              error: 'Неверный формат токена',
              details: 'Токен должен содержать userId'
          });
      }

      // 4. Добавляем пользователя в запрос
      req.user = {
          userId: decoded.userId,
          email: decoded.email,
          username: decoded.username
      };

      logger.info('Успешная аутентификация', { 
          userId: decoded.userId,
          ip: req.ip
      });
      next();
  });
}
// API endpoint для получения списка игр
app.get('/api/games', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        name,
        reviews,
        release_date,
        header_image,
        price,
        id
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
        name,
        reviews,
        release_date,
        header_image,
        price,
        id
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
  try {
      const { email, password, username } = req.body;
      
      // Проверка наличия всех полей
      if (!email || !password || !username) {
          return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
      }

      // Хеширование пароля
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Сохранение пользователя в БД
      const result = await pool.query(
          `INSERT INTO users (email, password_hash, username) 
           VALUES ($1, $2, $3) 
           RETURNING user_id, email, username`,
          [email, hashedPassword, username]
      );
      
      // Генерация JWT токена
      const payload = {
          userId: result.rows[0].user_id,
          email: result.rows[0].email,
          username: result.rows[0].username
      };
      
      const token = jwt.sign(payload, JWT_CONFIG.secret, { 
          expiresIn: JWT_CONFIG.expiresIn 
      });

      logger.info('Успешная регистрация', { userId: payload.userId });
      res.status(201).json({ 
          user: result.rows[0], 
          token 
      });

  } catch (error) {
      logger.error('Ошибка регистрации', { error: error.message });
      
      if (error.code === '23505') { // Ошибка уникальности в PostgreSQL
          res.status(400).json({ error: 'Email уже занят' });
      } else {
          res.status(500).json({ error: 'Ошибка сервера' });
      }
  }
});


app.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;

      // Поиск пользователя в БД
      const user = await pool.query(
          `SELECT * FROM users WHERE email = $1`, 
          [email]
      );
      
      if (user.rows.length === 0) {
          logger.warn('Попытка входа с несуществующим email', { email });
          return res.status(401).json({ error: 'Неверные учетные данные' });
      }

      // Проверка пароля
      const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
      if (!isValid) {
          logger.warn('Неверный пароль для пользователя', { email });
          return res.status(401).json({ error: 'Неверные учетные данные' });
      }

      // Генерация JWT токена
      const payload = {
          userId: user.rows[0].user_id,
          email: user.rows[0].email,
          username: user.rows[0].username
      };
      
      const token = jwt.sign(payload, JWT_CONFIG.secret, { 
          expiresIn: JWT_CONFIG.expiresIn 
      });

      logger.info('Успешный вход', { userId: payload.userId });
      res.json({ 
          user: { 
              id: user.rows[0].user_id, 
              email: user.rows[0].email,
              username: user.rows[0].username
          }, 
          token 
      });

  } catch (error) {
      logger.error('Ошибка входа', { error: error.message });
      res.status(500).json({ error: 'Ошибка сервера' });
  }
});


const replaceUserIdInExe = (buffer, userId) => {
  // HEX-представление placeholder (UTF-16LE)
  const placeholderHex = '300030003000300030003000300030002d0030003000300030002d0030003000300030002d0030003000300030002d003000';
  const placeholderBuffer = Buffer.from(placeholderHex, 'hex');
  

  // Конвертируем userId в UTF-16LE
  const userIdBuffer = Buffer.alloc(72);
  for (let i = 0; i < userId.length; i++) {
      userIdBuffer.writeUInt16LE(userId.charCodeAt(i), i * 2);
  }

  // Находим позицию placeholder
  const pos = buffer.indexOf(placeholderBuffer);
  if (pos === -1) {
      throw new Error("Placeholder не найден в файле");
  }

  // Создаем новый буфер с заменой
  const newBuffer = Buffer.from(buffer);
  userIdBuffer.copy(newBuffer, pos);
  
  return newBuffer;
};

// эндпоинт для скачивания EXE
app.get('/download-exe', authenticateToken, async (req, res) => {
  try {
      const userId = req.user.userId;
      const exePath = path.join(__dirname, 'PC_Info.exe');
      
      // Читаем файл
      const exeBuffer = fs.readFileSync(exePath);
      
      // Заменяем ID
      const modifiedBuffer = replaceUserIdInExe(exeBuffer, userId);
      
      // Проверяем, что замена произошла
      if (modifiedBuffer.equals(exeBuffer)) {
          throw new Error("Не удалось заменить UserID");
      }

      // Отправляем файл
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=PC_Info.exe');
      res.send(modifiedBuffer);

  } catch (err) {
      console.error('Download EXE error:', err);
      res.status(500).json({ 
          error: 'Ошибка при подготовке файла',
          details: err.message
      });
  }
});

app.get('/api/computers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      `SELECT * FROM user_computers WHERE user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error('Ошибка при получении конфигураций ПК', { error: err.message });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/computers/:computerId', authenticateToken, async (req, res) => {
  const { computerId } = req.params;
  const userId = req.user.userId;

  try {
    // Проверим, что ПК принадлежит пользователю
    const check = await pool.query(
      `SELECT * FROM user_computers WHERE computer_id = $1 AND user_id = $2`,
      [computerId, userId]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Нет доступа к этому ПК' });
    }

    await pool.query(
      `DELETE FROM user_computers WHERE computer_id = $1`,
      [computerId]
    );

    logger.info('ПК удален', { computerId, userId });
    res.json({ message: 'Компьютер удален' });
  } catch (err) {
    logger.error('Ошибка при удалении ПК', { error: err.message });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(`
      SELECT user_id, email, username, created_at
      FROM users 
      WHERE user_id = $1
    `, [req.user.userId]);
    console.log('Профиль с created_at:', user.rows[0]);
    res.json(user.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.patch('/profile/username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Некорректный никнейм' });
    }

    await pool.query(
      `UPDATE users SET username = $1 WHERE user_id = $2`,
      [username, req.user.userId]
    );

    res.json({ message: 'Никнейм обновлён', username });
  } catch (err) {
    console.error('Ошибка обновления ника:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});