import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Worker from '../models/Worker.js';
import Service from '../models/Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ Errore: MONGO_URI non trovata nel file .env');
  process.exit(1);
}

const seedProd = async () => {
  try {
    console.log('🚀 Avvio bootstrap di PRODUZIONE...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connesso a MongoDB Atlas.');

    // 1. Inizializzazione Admin (Upsert sicuro: se esiste già non fa danni)
    const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@barberia.it').toLowerCase().trim();
    const adminPlainPassword = process.env.ADMIN_INITIAL_PASSWORD || 'CambiamiAlPrimoLogin2026!';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPlainPassword, salt);

      await User.create({
        name: 'Titolare',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log(`👤 Admin creato con successo: ${adminEmail}`);
      console.log(`🔑 Password provvisoria impostata: ${adminPlainPassword}`);
    } else {
      console.log(`ℹ️ Admin (${adminEmail}) già presente nel DB. Nessuna modifica apportata.`);
    }

    // 2. Controllo Servizi (inserisce il listino base solo se la collezione è vuota)
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      await Service.create([
        {
          name: 'Taglio Capelli & Styling',
          description: 'Consulenza, lavaggio, taglio forbice/macchinetta e asciugatura.',
          durationMinutes: 30,
          price: 22.0
        },
        {
          name: 'Rasatura Barba Tradizionale',
          description: 'Panno caldo, olio pre-rasatura, rasoio a mano libera e dopobarba.',
          durationMinutes: 30,
          price: 18.0
        },
        {
          name: 'Combo Taglio + Barba',
          description: 'Trattamento completo testa e barba con panno caldo.',
          durationMinutes: 60,
          price: 35.0
        }
      ]);
      console.log('✂️ Listino servizi iniziale inserito.');
    } else {
      console.log(`ℹ️ Listino servizi già presente (${serviceCount} servizi trovati).`);
    }

    // 3. Controllo Operatori (inserisce un primo barbiere solo se non ce ne sono)
    const workerCount = await Worker.countDocuments({ isDeleted: false });
    if (workerCount === 0) {
      await Worker.create({
        name: 'Titolare Barbiere',
        color: '#d97706',
        isActive: true,
        isDeleted: false
      });
      console.log('💈 Primo operatore base inserito.');
    } else {
      console.log(`ℹ️ Organico già configurato (${workerCount} operatori attivi).`);
    }

    console.log('\n✅ Bootstrap Produzione completato con successo.\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante il seed di produzione:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedProd();