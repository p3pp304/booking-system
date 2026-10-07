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

    // 1. Wipe completo
    await Promise.all([
      User.deleteMany({}),
      Worker.deleteMany({}),
      Service.deleteMany({}),
      Booking.deleteMany({})
    ]);
    console.log('🧹 Database ripulito interamente.');

    // 2. Barbieri (Entità fisica sul calendario - non dipendono da nulla)
    const workers = await Worker.create([
      { name: 'Marco Rossi', color: '#2563eb', isActive: true, isDeleted: false },
      { name: 'Luca Bianchi', color: '#d97706', isActive: true, isDeleted: false },
      { name: 'Antonio Esposito', color: '#059669', isActive: true, isDeleted: false }
    ]);
    console.log('💈 3 Barbieri creati.');

    // 3. Utenti (Auth / Login - puntano a Worker tramite workerId)
    const usersToCreate = [
      new User({
        name: 'Admin Barberia',
        email: 'admin@barberia.it',
        phone: '+393330001122',
        password: 'Admin1234!',
        role: 'admin',
        workerId: null // L'admin non lavora su una poltrona specifica
      }),
      new User({
        name: 'Marco Rossi',
        email: 'marco@barberia.it',
        phone: '+393331112233',
        password: 'Staff1234!',
        role: 'staff',
        workerId: workers[0]._id // Assegnato subito in fase di creazione
      }),
      new User({
        name: 'Luca Bianchi',
        email: 'luca@barberia.it',
        phone: '+393334445566',
        password: 'Staff1234!',
        role: 'staff',
        workerId: workers[1]._id
      }),
      new User({
        name: 'Antonio Esposito',
        email: 'antonio@barberia.it',
        phone: '+393337778899',
        password: 'Staff1234!',
        role: 'staff',
        workerId: workers[2]._id
      })
    ];

    // Salvataggio con hook pre('save') per generare l'hash bcrypt
    for (const user of usersToCreate) {
      await user.save();
    }
    console.log('👤 4 Utenti creati con password hashata (1 Admin, 3 Staff).');

    // 4. Servizi di test
    const services = await Service.create([
      {
        name: 'Taglio Capelli & Styling',
        description: 'Taglio classico o moderno con rifiniture.',
        durationMinutes: 30,
        price: 22.0,
        category: 'Capelli'
      },
      {
        name: 'Rasatura Barba Tradizionale',
        description: 'Panno caldo e lama libera.',
        durationMinutes: 30,
        price: 18.0,
        category: 'Barba'
      },
      {
        name: 'Combo Taglio + Barba',
        description: 'Esperienza completa relax e grooming.',
        durationMinutes: 60,
        price: 35.0,
        category: 'Completo'
      },
      {
        name: 'Rifinitura Barba Rapida',
        description: 'Regolazione contorni guance e collo.',
        durationMinutes: 15,
        price: 12.0,
        category: 'Barba'
      }
    ]);
    console.log('✂️ 4 Servizi creati.');

    // 5. Prenotazioni e Blocchi per oggi
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    await Booking.create([
      // Appuntamento cliente con Marco alle 10:00
      {
        type: 'appointment',
        workerId: workers[0]._id,
        serviceId: services[0]._id,
        clientName: 'Mario Rossi',
        clientPhone: '+393331112233',
        price: services[0].price,
        startTime: new Date(y, m, d, 10, 0, 0),
        endTime: new Date(y, m, d, 10, 30, 0),
        cancellationCode: crypto.randomBytes(16).toString('hex'),
        status: 'confirmed'
      },
      // Appuntamento cliente con Luca alle 11:30
      {
        type: 'appointment',
        workerId: workers[1]._id,
        serviceId: services[2]._id,
        clientName: 'Giuseppe Verdi',
        clientPhone: '+393334445566',
        price: services[2].price,
        startTime: new Date(y, m, d, 11, 30, 0),
        endTime: new Date(y, m, d, 12, 30, 0),
        cancellationCode: crypto.randomBytes(16).toString('hex'),
        status: 'confirmed'
      },
      // Blocco assenza / pausa per Antonio
      {
        type: 'block',
        workerId: workers[2]._id,
        startTime: new Date(y, m, d, 15, 30, 0),
        endTime: new Date(y, m, d, 17, 0, 0),
        notes: 'Visita medica',
        cancellationCode: crypto.randomBytes(16).toString('hex'),
        status: 'blocked'
      }
    ]);
    console.log('📅 3 Prenotazioni/Blocchi di test inseriti per oggi.');

    console.log('\n=============================================');
    console.log('🎉 SEED DEV COMPLETATO!');
    console.log('---------------------------------------------');
    console.log('🔑 Admin:   admin@barberia.it   | Admin1234!');
    console.log('🔑 Marco:   marco@barberia.it   | Staff1234!');
    console.log('🔑 Luca:    luca@barberia.it    | Staff1234!');
    console.log('🔑 Antonio: antonio@barberia.it | Staff1234!');
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