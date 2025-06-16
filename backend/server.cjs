const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); 
const Fuse = require('fuse.js');
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

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // 32 байта
const IV_LENGTH = 16;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'products',
  password: '123456',
  port: 5413,
});

const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || '3a7d8f1e2c9b5a6d4e8f0a3b2c1d5e7f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4',
  expiresIn: '7d',
};
const codesMap = new Map();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//
app.get('/validate-token', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
    message: 'Токен действителен'
  });
});

//
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}
//
function decrypt(data) {
  if (!data || typeof data !== 'string' || !data.includes(':')) return null;

  const [ivBase64, encryptedData] = data.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
//
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
// 
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

//
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
//
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
//
app.get('/search', async (req, res) => {
  try {
    const { name, minPrice, maxPrice, tags } = req.query;

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
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${name}%`);
      paramIndex++;
    }


    if (minPrice || maxPrice) {
      const min = minPrice ? parseInt(minPrice) * 100 : 0; 
      const max = maxPrice ? parseInt(maxPrice) * 100 : 2000000;
      
      query += ` AND price BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(min, max);
    }

    if (tags) {
      const tagArray = typeof tags === 'string' ? tags.split(',') : [];
      if (tagArray.length > 0) {
        query += ` AND (`;
        tagArray.forEach((tag, index) => {
          if (index > 0) query += ` AND `;
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

//
app.get('/download-wpf', authenticateToken, async (req, res) => {
  try {
      // Путь к EXE-файлу (замените на актуальный)
      const filePath = path.join(__dirname, 'PCINFO.zip');
      
      // Проверяем, существует ли файл
      if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'Файл не найден' });
      }

      // Читаем файл и отправляем его
      const fileStream = fs.createReadStream(filePath);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=PCINFO.zip');
      
      fileStream.pipe(res); // Отправляем файл потоком

  } catch (err) {
      console.error('Download EXE error:', err);
      res.status(500).json({ 
          error: 'Ошибка при подготовке файла',
          details: err.message
      });
  }
});

//
app.get('/download-exe', authenticateToken, async (req, res) => {
  try {
      // Путь к EXE-файлу (замените на актуальный)
      const filePath = path.join(__dirname, 'PCINFO_Console.exe');
      
      // Проверяем, существует ли файл
      if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'Файл не найден' });
      }

      // Читаем файл и отправляем его
      const fileStream = fs.createReadStream(filePath);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=PCINFO.exe');
      
      fileStream.pipe(res); // Отправляем файл потоком

  } catch (err) {
      console.error('Download EXE error:', err);
      res.status(500).json({ 
          error: 'Ошибка при подготовке файла',
          details: err.message
      });
  }
});
//
app.get('/api/computers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      `SELECT * FROM user_computers WHERE user_id = $1`,
      [userId]
    );

    const decryptedRows = result.rows.map(row => ({
      ...row,
      cpu_name: decrypt(row.cpu_name),
      gpu_name: decrypt(row.gpu_name),
      directx_version: decrypt(row.directx_version),
      windows_version: decrypt(row.windows_version),
      windows_build: decrypt(row.windows_build),
      architecture_os: decrypt(row.architecture_os),
    }));

    res.json(decryptedRows);
  } catch (err) {
    logger.error('Ошибка при получении конфигураций ПК (дешифровка)', { error: err.message });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
//
app.delete('/api/computers/:computerId', authenticateToken, async (req, res) => {
  const { computerId } = req.params;
  const userId = req.user.userId;

  try {

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
//
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
//
app.patch('/profile/username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Некорректный никнейм' });
    }

    await pool.query(
      `UPDATE users 
       SET username = $1, updated_at = NOW() 
       WHERE user_id = $2`,
      [username.trim(), req.user.userId]
    );

    res.json({ message: 'Никнейм обновлён', username: username.trim() });
  } catch (err) {
    console.error('Ошибка обновления ника:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/check-compatibility', authenticateToken, async (req, res) => {
  try {
    const { computer_id, game_id } = req.body;
    if (!computer_id || !game_id) {
      return res.status(400).json({ error: 'computer_id и game_id обязательны' });
    }

    const [comp, game] = await Promise.all([
      pool.query(`SELECT cpu_name, gpu_name, total_ram_gb, directx_version, windows_version FROM user_computers WHERE computer_id = $1`, [computer_id]),
      pool.query(`SELECT min_sys, rec_sys FROM games WHERE id = $1`, [game_id])
    ]);

    if (!comp.rows.length || !game.rows.length) {
      return res.status(404).json({ error: 'ПК или игра не найдены' });
    }

    const userPcRaw = comp.rows[0];
    const userPc = {
      cpu_name: decrypt(userPcRaw.cpu_name),
      gpu_name: decrypt(userPcRaw.gpu_name),
      total_ram_gb: userPcRaw.total_ram_gb,
      directx_version: decrypt(userPcRaw.directx_version),
      windows_version: decrypt(userPcRaw.windows_version),
      windows_build: decrypt(userPcRaw.windows_build),
      architecture_os: decrypt(userPcRaw.architecture_os),
    };
    const { min_sys, rec_sys } = game.rows[0];

    const parseSys = (sys) => {
      const parsed = { cpu: null, gpu: null, ram: null, directx: null, windows: null };
      if (!Array.isArray(sys)) return parsed;

      for (const part of sys) {
        const lower = part.toLowerCase();

        if (!parsed.cpu && /(intel|amd).*\d/.test(lower)) {
          parsed.cpu = part;
        } else if (!parsed.gpu && /(gtx|rtx|radeon|rx|hd|arc|graphics|geforce)/i.test(lower)) {
          parsed.gpu = part;
        }

        if (/(\d+)\s*(гб|gb).*озу/i.test(part)) {
          const match = part.match(/(\d+)/);
          if (match) parsed.ram = parseInt(match[1]);
        }

        if (/directx|верс/i.test(part)) {
          const match = part.match(/\d+/);
          if (match) parsed.directx = parseInt(match[0]);
        }

        if (/windows/i.test(part)) {
          parsed.windows = part;
        }
      }

      return parsed;
    };

    const normalizeHardwareName = (name) => {
      return name
        .toLowerCase()
        .replace(/®|™|\(r\)|\(tm\)|cpu|@[\d.]+ghz/gi, '')
        .replace(/(nvidia|amd|intel|geforce|radeon)/gi, '')
        .replace(/\(.+?\)/g, '')
        .replace(/[|\/]/g, ',')
        .replace(/[^a-z0-9\s\.,\-]/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    const parseDX = (v) => {
      if (!v) return null;
      const match = v.toString().match(/\d+/);
      return match ? parseInt(match[0]) : null;
    };

    const parseWin = (input) => {
      if (!input || typeof input !== 'string') return null;
      return input
        .replace(/®|™/gi, '')
        .replace(/(home|pro|enterprise|ultimate|32|64)[\s-]*bit/gi, '')
        .replace(/(edition|version|os|operating system)/gi, '')
        .match(/windows\s*(\d+)/i)?.[1] || null;
    };


    const getScoreFromCandidates = async (table, inputRaw, mode = 'best') => {
      if (!inputRaw || typeof inputRaw !== 'string') return null;

      const devices = inputRaw
        .split(/\/|или|,| or |\|/i)
        .map(n => normalizeHardwareName(n.trim()))
        .filter(Boolean)
        .filter(n =>
          n.length > 6 &&
          !/^\d+(\.\d+)?\s*(ghz|gb)?$/i.test(n) &&
          !/^(directx|newer|older|version)/i.test(n) &&
          !/^\d+$/i.test(n)
        );

      const { rows } = await pool.query(`SELECT name, score FROM ${table}`);
      const fuse = new Fuse(rows, {
        keys: ['name'],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 4
      });

      let scores = [];

      for (const name of devices) {
        const result = fuse.search(name);
        if (result.length) {
          const match = result[0];
          const normalizedInput = name.toLowerCase();
          const normalizedMatch = match.item.name.toLowerCase();

          if (normalizedInput === normalizedMatch) {
            console.log(`✅ [${table}] "${name}" точно совпадает с "${match.item.name}" → score: ${match.item.score}`);
            scores.push(match.item.score);
            continue;
          }

          if (match.score > 0.35) {
            console.warn(`⚠️ [${table}] "${name}" ≈ "${match.item.name}" — низкий score (${match.score.toFixed(4)}) (использован как fallback)`);
          } else {
            console.log(`🔍 [${table}] "${name}" ≈ "${match.item.name}" → score: ${match.item.score}`);
          }

          scores.push(match.item.score);
        } else {
          console.warn(`❌ [${table}] "${name}" — не найдено`);
        }
      }

      console.log(`📦 Candidates parsed from "${inputRaw}":`, devices);
      if (!scores.length) return null;
      return mode === 'min' ? Math.min(...scores) : Math.max(...scores);
    };

    const isRoughlyGreaterOrEqual = (value, target, tolerance = 0.03) => {
      if (value == null || target == null) return false;
      return value >= target * (1 - tolerance);
    };

    const compare = (user, min, rec, label) => {
      if (user == null || min == null) return `❓ Неизвестно (${label})`;
      if (rec && isRoughlyGreaterOrEqual(user, rec)) return `✅ Рекомендуемый уровень`;
      if (isRoughlyGreaterOrEqual(user, min)) return `⚠️ Минимальный уровень`;
      return `❌ Слабый(-ая) ${label}`;
    };

    const minParsed = parseSys(min_sys);
    const recParsed = parseSys(rec_sys);

    for (const key of ['cpu', 'gpu', 'ram', 'directx', 'windows']) {
      if (!recParsed[key] && minParsed[key]) {
        recParsed[key] = minParsed[key];
        console.log(`📥 [fallback] rec_sys.${key} ← min_sys.${key}`);
      }
    }

    if (!minParsed.gpu && recParsed.gpu) {
      minParsed.gpu = recParsed.gpu;
      console.log(`📥 [fallback] min_sys.gpu ← rec_sys.gpu`);
    }

    const userCpuScore = await getScoreFromCandidates('cpu', userPc.cpu_name);
    const minCpuScore = await getScoreFromCandidates('cpu', minParsed.cpu, 'min');
    const recCpuScore = await getScoreFromCandidates('cpu', recParsed.cpu, 'best');

    const userGpuScore = await getScoreFromCandidates('gpu', userPc.gpu_name);
    const minGpuScore = await getScoreFromCandidates('gpu', minParsed.gpu, 'min');
    const recGpuScore = await getScoreFromCandidates('gpu', recParsed.gpu, 'best');

    const result = {
      cpu: compare(userCpuScore, minCpuScore, recCpuScore, 'процессор'),
      gpu: compare(userGpuScore, minGpuScore, recGpuScore, 'видеокарта'),
      ram: compare(userPc.total_ram_gb, minParsed.ram, recParsed.ram, 'ОЗУ'),
      directx: (minParsed.directx == null && recParsed.directx == null)
        ? 'ℹ️ Не указано издателем'
        : compare(parseDX(userPc.directx_version), minParsed.directx, recParsed.directx, 'DirectX'),
      windows: (minParsed.windows == null && recParsed.windows == null)
        ? 'ℹ️ Не указано издателем'
        : compare(parseWin(userPc.windows_version), parseWin(minParsed.windows), parseWin(recParsed.windows), 'Windows'),
    };


    console.log('================= СРАВНЕНИЕ =================');
    console.log(`🧠 CPU user: ${userCpuScore} | min: ${minCpuScore} | rec: ${recCpuScore}`);
    console.log(`🎮 GPU user: ${userGpuScore} | min: ${minGpuScore} | rec: ${recGpuScore}`);
    console.log(`💾 RAM user: ${userPc.total_ram_gb} | min: ${minParsed.ram} | rec: ${recParsed.ram}`);
    console.log(`🌀 DirectX user: ${parseDX(userPc.directx_version)} | min: ${minParsed.directx} | rec: ${recParsed.directx}`);
    console.log(`🪟 Windows user: ${parseWin(userPc.windows_version)} | min: ${parseWin(minParsed.windows)} | rec: ${parseWin(recParsed.windows)}`);
    console.log('=============================================');

    res.json({
      result,
      debug: {
        userPc,
        minParsed,
        recParsed,
        userCpuScore,
        recCpuScore,
        minCpuScore,
        userGpuScore,
        recGpuScore,
        minGpuScore,
      }
    });

  } catch (err) {
    console.error('Ошибка проверки совместимости:', err);
    res.status(500).json({ error: 'Ошибка сервера', details: err.message });
  }
});

//
app.patch('/api/computers/:id/name', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { computer_name } = req.body;

  if (!computer_name || typeof computer_name !== 'string') {
    return res.status(400).json({ error: 'Некорректное имя' });
  }

  try {
    await pool.query(
      'UPDATE user_computers SET computer_name = $1 WHERE computer_id = $2',
      [computer_name.trim(), id]
    );
    res.json({ success: true, computer_name: computer_name.trim() });
  } catch (err) {
    console.error('Ошибка обновления имени компьютера:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
//
app.post('/api/generate-code', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const now = Date.now();

  const last = codesMap.get(userId);
  if (last && now - last.created < 60 * 1000) {
    return res.status(429).json({ error: 'Можно запросить новый код раз в 1 минуту' });
  }

  const code = generateCode();

  // Очистка старых
  await pool.query(`DELETE FROM user_codes WHERE user_id = $1`, [userId]);

  await pool.query(
    `INSERT INTO user_codes (code, user_id) VALUES ($1, $2)`,
    [code, userId]
  );

  codesMap.set(userId, { code, created: now });

  res.json({ code });
});
//
setInterval(async () => {
  await pool.query(`DELETE FROM user_codes WHERE created_at < now() - INTERVAL '1 minute'`);
}, 30000);

//
app.post('/submit-system-info', async (req, res) => {
  const { code } = req.query;
  const pcInfo = req.body;

  if (!code || code.length !== 6) {
    return res.status(400).json({ error: 'Неверный код' });
  }

  try {
    const result = await pool.query(
      `SELECT user_id FROM user_codes WHERE code = $1 AND created_at > NOW() - INTERVAL '1 minutes'`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Код не найден или просрочен' });
    }

    const userId = result.rows[0].user_id;

    await pool.query(`
      INSERT INTO user_computers (
        user_id, cpu_name, gpu_name, total_ram_gb, 
        directx_version, windows_version, windows_build, architecture_os
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
  userId,
  encrypt(pcInfo.CpuName),
  encrypt(pcInfo.GpuName),
  pcInfo.TotalRamGb,
  encrypt(pcInfo.DirectXVersion),
  encrypt(pcInfo.WindowsVersion),
  encrypt(pcInfo.WindowsBuild),
  encrypt(pcInfo.OSArchitecture),
    ]);

    await pool.query(`DELETE FROM user_codes WHERE code = $1`, [code]);

    res.json({ message: 'Конфигурация успешно сохранена' });
  } catch (err) {
    console.error('Ошибка сохранения данных ПК:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});



const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});