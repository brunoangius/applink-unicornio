const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const IOS_URL = 'https://apps.apple.com/br/app/papelaria-unic%C3%B3rnio/id1629883720';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.converta.papunicornio';
const FALLBACK_URL = 'https://www.papelariaunicornio.com.br/app';

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS redirects (
      id SERIAL PRIMARY KEY,
      platform VARCHAR(10) NOT NULL,
      ip VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

app.get('/api/stats', async (req, res) => {
  try {
    const { from, to } = req.query;
    const params = [from || '1970-01-01', to || 'now()'];

    const totals = await pool.query(`
      SELECT platform, COUNT(*) as count
      FROM redirects
      WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz
      GROUP BY platform
    `, params);

    const daily = await pool.query(`
      SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as date,
             platform, COUNT(*) as count
      FROM redirects
      WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz
      GROUP BY date, platform
      ORDER BY date
    `, params);

    const hourly = await pool.query(`
      SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo') as hour,
             COUNT(*) as count
      FROM redirects
      WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz
      GROUP BY hour ORDER BY hour
    `, params);

    const firstAccess = await pool.query(`SELECT MIN(created_at) as first FROM redirects`);

    res.json({
      totals: totals.rows,
      daily: daily.rows,
      hourly: hourly.rows,
      firstAccess: firstAccess.rows[0].first
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', async (req, res) => {
  if (req.path === '/favicon.ico') return res.status(204).end();

  const ua = req.headers['user-agent'] || '';
  let platform, url;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = 'ios'; url = IOS_URL;
  } else if (/Android/i.test(ua)) {
    platform = 'android'; url = ANDROID_URL;
  } else {
    platform = 'fallback'; url = FALLBACK_URL;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  pool.query('INSERT INTO redirects (platform, ip, user_agent) VALUES ($1, $2, $3)',
    [platform, ip, ua]).catch(() => {});

  res.redirect(301, url);
});

initDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
});
