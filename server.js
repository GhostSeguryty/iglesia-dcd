/**
 * Discipulado Cristiano de Durango
 * npm install && npm start
 */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  site: path.join(DATA_DIR, 'site.json'),
  events: path.join(DATA_DIR, 'events.json'),
  visits: path.join(DATA_DIR, 'visits.json'),
  prayers: path.join(DATA_DIR, 'prayers.json')
};

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

let mem = { users: [], site: null, events: [], visits: [], prayers: [] };
const sessions = new Map();

app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
async function kvGet(key, fallback) {
  const r = await pool.query('SELECT value FROM kv WHERE key = $1', [key]);
  return r.rows.length ? r.rows[0].value : fallback;
}
async function kvSet(key, value) {
  await pool.query(
    `INSERT INTO kv(key, value) VALUES($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)]
  );
}
function persist(key, value) {
  mem[key] = value;
  if (pool) kvSet(key, value).catch((e) => console.error('save', key, e.message));
  else writeJSON(FILES[key], value);
}

function defaultSite() {
  return {
    churchName: 'Discipulado Cristiano de Durango',
    tagline: 'Una familia que camina con Cristo',
    pastorName: 'Lic. Otto Hugo Magallan',
    pastorBio: 'Pastor de Discipulado Cristiano de Durango. Comprometido con el evangelio, la oración y el discipulado de todas las edades.',
    welcome: 'Te damos la bienvenida. Aquí hay un lugar para ti: niños, adolescentes, jóvenes y familias. Ven, conoce y crece en Cristo.',
    heroVerse: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.',
    heroVerseRef: 'Juan 3:16',
    verses: [
      { text: 'Confía en Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.', ref: 'Proverbios 3:5' },
      { text: 'Todo lo puedo en Cristo que me fortalece.', ref: 'Filipenses 4:13' },
      { text: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.', ref: 'Mateo 11:28' },
      { text: 'Jehová es mi pastor; nada me faltará.', ref: 'Salmo 23:1' }
    ],
    address: 'Durango, Dgo. (edita la dirección exacta en el panel)',
    mapsUrl: '',
    phone: '',
    email: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
    about: 'Somos Discipulado Cristiano de Durango. Creemos en Jesucristo como Señor y Salvador. Evangelizamos, oramos y formamos discípulos: niños, adolescentes, jóvenes y adultos.',
    schedule: [
      { day: 'Lunes', time: '6:00 p.m.', title: 'Evangelismo', place: 'Plaza', note: 'Salimos a compartir el evangelio.' },
      { day: 'Viernes', time: '7:15 p.m.', title: 'Caldera de oración', place: 'Templo', note: 'Tiempo de intercesión y presencia de Dios.' },
      { day: 'Sábado', time: '12:00 p.m.', title: 'Estudio de adolescentes', place: 'Templo', note: 'Formación para adolescentes.' },
      { day: 'Sábado', time: '4:30 p.m.', title: 'Jóvenes', place: 'Templo', note: 'Reunión de jóvenes.' },
      { day: 'Sábado', time: '6:30 p.m.', title: 'Culto general', place: 'Templo', note: 'Servicio para toda la familia.' },
      { day: 'Sábado', time: '6:30 p.m.', title: 'Niños chiquitos', place: 'Templo', note: 'Clase especial para los más pequeños.' },
      { day: 'Sábado', time: '6:30 p.m.', title: 'Niños avanzados', place: 'Templo', note: 'Clase para niños más grandes.' }
    ],
    gallery: []
  };
}

function defaultEvents() {
  return [
    {
      id: uuidv4(),
      title: 'Evangelismo en la plaza',
      date: '',
      time: 'Lunes 6:00 p.m.',
      place: 'Plaza',
      address: 'Durango, Dgo.',
      description: 'Salimos cada lunes a predicar y compartir el amor de Cristo.',
      image: ''
    },
    {
      id: uuidv4(),
      title: 'Caldera de oración',
      date: '',
      time: 'Viernes 7:15 p.m.',
      place: 'Templo',
      address: '',
      description: 'Noche de oración. Ven a interceder con la iglesia.',
      image: ''
    }
  ];
}

async function initStore() {
  if (pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value JSONB NOT NULL)`);
    mem.users = await kvGet('users', []);
    mem.site = await kvGet('site', null);
    mem.events = await kvGet('events', []);
    mem.visits = await kvGet('visits', []);
    mem.prayers = await kvGet('prayers', []);
    if (!mem.site) {
      mem.site = defaultSite();
      await kvSet('site', mem.site);
    }
    if (!Array.isArray(mem.events) || !mem.events.length) {
      mem.events = defaultEvents();
      await kvSet('events', mem.events);
    }
    if (!Array.isArray(mem.users)) mem.users = [];
    if (!Array.isArray(mem.visits)) mem.visits = [];
    if (!Array.isArray(mem.prayers)) mem.prayers = [];
    console.log('  Almacenamiento: PostgreSQL');
    return;
  }
  ensureDataDir();
  mem.users = readJSON(FILES.users, []);
  mem.site = readJSON(FILES.site, null);
  if (!mem.site || !mem.site.churchName) {
    mem.site = defaultSite();
    writeJSON(FILES.site, mem.site);
  }
  mem.events = readJSON(FILES.events, []);
  if (!mem.events.length) {
    mem.events = defaultEvents();
    writeJSON(FILES.events, mem.events);
  }
  mem.visits = readJSON(FILES.visits, []);
  mem.prayers = readJSON(FILES.prayers, []);
  console.log('  Almacenamiento: JSON local');
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && req.path !== '/api/visits') {
    if (req.method === 'GET' && (req.path === '/api/site' || req.path === '/api/events' || req.path === '/api/status')) {
      const entry = {
        id: uuidv4(),
        at: new Date().toISOString(),
        ip: clientIp(req),
        path: req.path,
        ua: String(req.headers['user-agent'] || '').slice(0, 220)
      };
      mem.visits = [entry, ...(mem.visits || [])].slice(0, 400);
      persist('visits', mem.visits);
    }
  }
  next();
});

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}
function getToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
function auth(req, res, next) {
  const t = getToken(req);
  const s = t && sessions.get(t);
  if (!s) return res.status(401).json({ error: 'No autorizado' });
  const user = mem.users.find((u) => u.id === s.userId);
  if (!user) return res.status(401).json({ error: 'Sesión inválida' });
  req.user = user;
  next();
}

app.get('/api/status', (req, res) => {
  res.json({ hasAdmin: mem.users.some((u) => u.role === 'admin'), ok: true });
});

app.get('/api/site', (req, res) => {
  res.json({ site: mem.site || defaultSite() });
});

app.get('/api/events', (req, res) => {
  res.json({ events: mem.events || [] });
});

app.post('/api/prayers', (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 80);
  const message = String((req.body && req.body.message) || '').trim().slice(0, 800);
  if (name.length < 2 || message.length < 4) {
    return res.status(400).json({ error: 'Escribe tu nombre y tu petición.' });
  }
  const item = { id: uuidv4(), name, message, at: new Date().toISOString(), ip: clientIp(req) };
  mem.prayers = [item, ...(mem.prayers || [])].slice(0, 200);
  persist('prayers', mem.prayers);
  res.json({ ok: true });
});

app.post('/api/setup', async (req, res) => {
  if (mem.users.some((u) => u.role === 'admin')) {
    return res.status(400).json({ error: 'Ya existe un administrador.' });
  }
  const username = String((req.body && req.body.username) || '').trim();
  const password = String((req.body && req.body.password) || '');
  const name = String((req.body && req.body.name) || username).trim();
  if (username.length < 3) return res.status(400).json({ error: 'Usuario muy corto.' });
  if (password.length < 6) return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres.' });
  const user = {
    id: uuidv4(),
    name,
    username: username.toLowerCase(),
    password: await bcrypt.hash(password, 10),
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  mem.users = [user];
  persist('users', mem.users);
  const token = uuidv4();
  sessions.set(token, { userId: user.id });
  res.json({ token, user: publicUser(user) });
});

app.post('/api/login', async (req, res) => {
  const username = String((req.body && req.body.username) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  const user = mem.users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  const token = uuidv4();
  sessions.set(token, { userId: user.id });
  res.json({ token, user: publicUser(user) });
});

app.post('/api/logout', auth, (req, res) => {
  const t = getToken(req);
  if (t) sessions.delete(t);
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.put('/api/site', auth, (req, res) => {
  const incoming = req.body || {};
  mem.site = { ...(mem.site || defaultSite()), ...incoming };
  persist('site', mem.site);
  res.json({ site: mem.site });
});

app.post('/api/events', auth, (req, res) => {
  const b = req.body || {};
  const ev = {
    id: uuidv4(),
    title: String(b.title || 'Evento').trim(),
    date: String(b.date || '').trim(),
    time: String(b.time || '').trim(),
    place: String(b.place || '').trim(),
    address: String(b.address || '').trim(),
    description: String(b.description || '').trim(),
    image: String(b.image || '').trim()
  };
  mem.events = [ev, ...(mem.events || [])];
  persist('events', mem.events);
  res.json({ event: ev });
});

app.put('/api/events/:id', auth, (req, res) => {
  const i = mem.events.findIndex((e) => e.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'No encontrado' });
  mem.events[i] = { ...mem.events[i], ...req.body, id: mem.events[i].id };
  persist('events', mem.events);
  res.json({ event: mem.events[i] });
});

app.delete('/api/events/:id', auth, (req, res) => {
  mem.events = mem.events.filter((e) => e.id !== req.params.id);
  persist('events', mem.events);
  res.json({ ok: true });
});

app.get('/api/visits', auth, (req, res) => {
  res.json({ visits: mem.visits || [] });
});

app.get('/api/prayers', auth, (req, res) => {
  res.json({ prayers: mem.prayers || [] });
});

app.delete('/api/prayers/:id', auth, (req, res) => {
  mem.prayers = (mem.prayers || []).filter((p) => p.id !== req.params.id);
  persist('prayers', mem.prayers);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initStore()
  .then(() => {
    app.listen(PORT, () => {
      console.log('');
      console.log('  Discipulado Cristiano de Durango');
      console.log('  http://localhost:' + PORT);
      console.log('');
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
