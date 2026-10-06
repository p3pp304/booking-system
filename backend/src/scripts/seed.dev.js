import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Worker from '../models/Worker.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ Errore: MONGO_URI non trovata nel file .env');
  process.exit(1);
}

const seedDev = async () => {
  try {
    console.log('🧪 Avvio SEED SVILUPPO (Reset completo DB)...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connesso a MongoDB Atlas.');

    // 1. Wipe completo per pulire i test precedenti
    await Promise.all([
      User.deleteMany({}),
      Worker.deleteMany({}),
      Service.deleteMany({}),
      Booking.deleteMany({})
    ]);
    console.log('🧹 Database ripulito interamente.');

    // 2. Barbieri di test
    const workers = await Worker.create([
      { name: 'Marco Rossi', color: '#2563eb', isActive: true, isDeleted: false },
      { name: 'Luca Bianchi', color: '#d97706', isActive: true, isDeleted: false },
      { name: 'Antonio Esposito', color: '#059669', isActive: true, isDeleted: false }
    ]);
    console.log('💈 3 Barbieri creati.');

    // 3. Servizi di test
    const services = await Service.create([
      {
        name: 'Taglio Capelli & Styling',
        description: 'Taglio classico o moderno con rifiniture.',
        durationMinutes: 30,
        price: 22.0
      },
      {
        name: 'Rasatura Barba Tradizionale',
        description: 'Panno caldo e lama libera.',
        durationMinutes: 30,
        price: 18.0
      },
      {
        name: 'Combo Taglio + Barba',
        description: 'Esperienza completa relax e grooming.',
        durationMinutes: 60,
        price: 35.0
      },
      {
        name: 'Rifinitura Barba Rapida',
        description: 'Regolazione contorni guance e collo.',
        durationMinutes: 15,
        price: 12.0
      }
    ]);
    console.log('✂️ 4 Servizi creati.');

    // 4. Utenti: Admin e Staff
    await User.create([
      {
        name: 'Titolare Boss',
        email: 'admin@barberia.it',
        password: 'Admin1234!',
        role: 'admin',
        workerId: workers[0]._id
      },
      {
        name: 'Luca Barbiere',
        email: 'luca@barberia.it',
        password: 'Staff1234!',
        role: 'staff',
        workerId: workers[1]._id
      }
    ]);
    console.log('👤 Utenti creati: admin@barberia.it e luca@barberia.it');

    // 5. Prenotazioni fittizie per oggi
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    await Booking.create([
      // Appuntamento cliente con Marco alle 10:00
      {
        customerName: 'Mario Rossi',
        customerPhone: '+393331112233',
        clientName: 'Mario Rossi',
        clientPhone: '+393331112233',
        serviceId: services[0]._id,
        workerId: workers[0]._id,
        startTime: new Date(y, m, d, 10, 0, 0),
        endTime: new Date(y, m, d, 10, 30, 0),
        cancellationCode: crypto.randomBytes(8).toString('hex'),
        status: 'confirmed',
        type: 'appointment'
      },
      // Appuntamento cliente con Luca alle 11:30
      {
        customerName: 'Giuseppe Verdi',
        customerPhone: '+393334445566',
        clientName: 'Giuseppe Verdi',
        clientPhone: '+393334445566',
        serviceId: services[2]._id, // 60 min combo
        workerId: workers[1]._id,
        startTime: new Date(y, m, d, 11, 30, 0),
        endTime: new Date(y, m, d, 12, 30, 0),
        cancellationCode: crypto.randomBytes(8).toString('hex'),
        status: 'confirmed',
        type: 'appointment'
      },
      // Blocco assenza / permesso per Antonio
      {
        customerName: '[BLOCCO] Visita medica',
        customerPhone: '',
        clientName: '[BLOCCO] Visita medica',
        clientPhone: '',
        workerId: workers[2]._id,
        startTime: new Date(y, m, d, 15, 30, 0),
        endTime: new Date(y, m, d, 17, 0, 0),
        cancellationCode: crypto.randomBytes(8).toString('hex'),
        status: 'confirmed',
        type: 'block',
        note: 'Visita medica'
      }
    ]);
    console.log('📅 3 Prenotazioni/Blocchi di test inseriti per oggi.');

    console.log('\n=============================================');
    console.log('🎉 SEED DEV COMPLETATO!');
    console.log('---------------------------------------------');
    console.log('🔑 Admin: admin@barberia.it | Admin1234!');
    console.log('🔑 Staff: luca@barberia.it  | Staff1234!');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante il seed di sviluppo:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDev();