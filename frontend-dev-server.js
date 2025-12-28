// Simple frontend dev server that serves the test page and proxies /api and /admin to the test server
require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_TARGET = process.env.API_TARGET || 'http://localhost:4000';

const app = express();

app.use('/api', createProxyMiddleware({ target: API_TARGET, changeOrigin: true, logLevel: 'warn' }));
app.use('/admin', createProxyMiddleware({ target: API_TARGET, changeOrigin: true, logLevel: 'warn' }));

const STATIC_DIR = path.join(__dirname, 'docs', 'test-page');
app.use(express.static(STATIC_DIR));
app.get('*', (req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend dev server running: http://0.0.0.0:${PORT}`);
  console.log(`Proxying /api and /admin → ${API_TARGET}`);
});
