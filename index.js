const express = require('express');
const path = require('path');
const fs = require('fs');
const shortid = require('shortid');

const app = express();
const PORT = process.env.PORT || 3000;

// Храним ссылки в db.json
const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');

app.use(express.json());
app.use(express.static(__dirname));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Генерация короткой ссылки
app.post('/shorten', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const code = shortid.generate();
  db[code] = url;
  fs.writeFileSync(dbPath, JSON.stringify(db));

  res.json({ shortUrl: `${process.env.PUBLIC_URL || 'http://localhost:'+PORT}/r/${code}` });
});

// Редирект
app.get('/r/:code', (req, res) => {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const url = db[req.params.code];
  if (url) {
    return res.redirect(url);
  }
  res.status(404).send('Link not found');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
