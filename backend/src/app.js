import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { getUploadsRoot } from './services/storage.service.js';

dotenv.config();

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  clientOrigins.push('http://127.0.0.1:5173');
  clientOrigins.push('http://localhost:5173');
  // Static site-server runs on port 8080
  clientOrigins.push('http://127.0.0.1:8080');
  clientOrigins.push('http://localhost:8080');
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/uploads', express.static(getUploadsRoot()));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Unipaper API',
    docs: '/api/docs',
    health: '/api/health',
    readiness: '/api/ready'
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
