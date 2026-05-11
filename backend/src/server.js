import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import app from './app.js';
import { connectDB } from './config/db.js';

// Always load .env from the backend/ directory, regardless of cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const port = process.env.PORT || 5000;
let server;

const shutdown = (signal) => {
  console.log(`${signal} received, closing Unipaper API...`);

  if (!server) {
    process.exit(0);
  }

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(0);
  }, 10000).unref();
};

connectDB()
  .then(() => {
    server = app.listen(port, () => {
      console.log(`Unipaper API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
