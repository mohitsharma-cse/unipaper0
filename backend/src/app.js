import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { getUploadsRoot } from './services/storage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Root of the project (two levels up from backend/src/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  app.set('trust proxy', 1);
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const normalizeOrigin = (origin) => {
  try {
    return new URL(origin).origin;
  } catch {
    return String(origin || '').trim().replace(/\/+$/, '');
  }
};

const defaultClientOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'https://justudynotes-bgapgdajejggdrbj.eastasia-01.azurewebsites.net'
];

const configuredClientOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const clientOrigins = [...new Set([
  ...defaultClientOrigins.map(normalizeOrigin),
  ...configuredClientOrigins
])];

app.locals.clientOrigins = clientOrigins;

console.log(`CORS allowed origins: ${clientOrigins.join(', ')}`);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // frontend uses inline styles/scripts
}));

app.use(cors({
  origin(origin, callback) {
    const requestOrigin = normalizeOrigin(origin);
    if (!origin || clientOrigins.includes(requestOrigin)) {
      return callback(null, true);
    }
    const error = new Error(`CORS blocked for origin: ${origin}`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/cors-debug', (req, res) => {
  res.json({
    success: true,
    requestOrigin: req.get('origin') || null,
    clientUrlConfigured: Boolean(process.env.CLIENT_URL),
    nodeEnv: process.env.NODE_ENV || null,
    allowedOrigins: clientOrigins
  });
});

if (!isProd) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Local uploads (development fallback storage) ──────────────────────────────
app.use('/uploads', express.static(getUploadsRoot()));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api',       publicRoutes);

// ── Static frontend (serves index.html, style.css, bg.png, mobile-bg.png …) ──
// HTML = no-cache so users always get the latest version after a deploy.
// CSS / JS / images = 1-day browser cache to reduce bandwidth.
app.use(express.static(PROJECT_ROOT, {
  index: 'index.html',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    }
  }
}));

// ── SPA / named routes ────────────────────────────────────────────────────────
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'admin.html'));
});

// Catch-all: return index.html for any unmatched GET (not API, not uploads)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  res.sendFile(path.join(PROJECT_ROOT, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

export default app;
