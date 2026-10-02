import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';

import publicRouter from './routers/public/index.js';
import adminRouter from './routers/admin/index.js';

// 1. Inizializza subito le variabili d'ambiente
dotenv.config();

// 2. Inizializza l'applicazione Express
const app = express();
const port = process.env.PORT;


// 5. Middleware di parsing
app.use(cors());
app.use(express.json());

// Montaggio dei due canali principali
app.use('/api', publicRouter);       // es: /api/bookings, /api/services, /api/workers
app.use('/api/admin', adminRouter); // es: /api/admin/bookings, /api/admin/services...

// 6. Connessione a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connesso con successo'))
  .catch((error) => console.error('Errore di connessione a MongoDB:', error));

// 7. Endpoint base di test
app.get('/', (req, res) => {
  res.send('Benvenuto');
});

// 9. Avvio server
app.listen(port, () => {
  console.log(`Il server è in ascolto sulla porta ${port}`);
});