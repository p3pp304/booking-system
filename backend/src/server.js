import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import publicRouter from './routers/public/index.js';
import adminRouter from './routers/admin/index.js';

// 1. Inizializza subito le variabili d'ambiente
dotenv.config();

// 2. Inizializza l'applicazione Express
const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');

// Parsing delle origini definite nelle variabili d'ambiente
const envOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    const withProtocol = /^https?:\/\//i.test(origin) ? origin : `https://${origin}`;
    try {
      return new URL(withProtocol).origin;
    } catch {
      return origin;
    }
  });

// Configurazione CORS
const corsOptions = {
  origin(origin, callback) {
    // Consenti chiamate senza origin (es. curl, postman, server-to-server)
    if (!origin) return callback(null, true);

    // In sviluppo consenti tutto
    if (process.env.NODE_ENV !== 'production') return callback(null, true);

    // In produzione: consenti se presente nelle env, localhost, o se appartiene a vercel.app
    const isAllowedEnv = envOrigins.includes(origin);
    const isVercel = origin.endsWith('.vercel.app');
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    if (isAllowedEnv || isVercel || isLocalhost) {
      return callback(null, true);
    }

    return callback(new Error(`Origine CORS bloccata: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Applica CORS e gestisci esplicitamente il preflight OPTIONS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

app.get('/api/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'starting',
    database: databaseReady ? 'connected' : 'disconnected',
  });
});

app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

app.get('/', (req, res) => {
  const indexPath = resolve(frontendDist, 'index.html');
  if (existsSync(indexPath)) return res.sendFile(indexPath);
  return res.send('Atelier API is running');
});

app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();

  const indexPath = resolve(frontendDist, 'index.html');
  if (!existsSync(indexPath)) return next();
  return res.sendFile(indexPath, (error) => error && next(error));
});

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI non configurata.');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connesso con successo');
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server in ascolto sulla porta ${port}`);
    });
  } catch (error) {
    console.error('Avvio server fallito:', error.message);
    process.exitCode = 1;
  }
};

startServer();