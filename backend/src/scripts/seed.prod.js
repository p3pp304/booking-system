import mongoose from 'mongoose';
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

    // 1. Controllo / Creazione Operatore Base (Titolare)
    let masterWorker = await Worker.findOne({ isDeleted: false });

    if (!masterWorker) {
      masterWorker = await Worker.create({
        name: 'Titolare',
        color: '#d97706',
        isActive: true,
        isDeleted: false
      });
      console.log(`💈 Primo operatore creato (ID: ${masterWorker._id}).`);
    } else {
      console.log(`ℹ️ Operatori già presenti (${masterWorker.name} rilevato).`);
    }

    // 2. Controllo / Creazione Admin con aggancio al Worker
    const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@barberia.it').toLowerCase().trim();
    const adminPlainPassword = process.env.ADMIN_INITIAL_PASSWORD || 'CambiamiAlPrimoLogin2026!';

    let existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const newAdmin = new User({
        name: 'Titolare',
        email: adminEmail,
        password: adminPlainPassword,
        role: 'admin',
        workerId: masterWorker._id // Assegnato subito alla poltrona/colonna
      });
      await newAdmin.save(); // Esegue il pre-save hook con bcrypt

      console.log(`👤 Admin creato con successo: ${adminEmail}`);
      console.log(`🔑 Password provvisoria impostata: ${adminPlainPassword}`);
      console.log(`🔗 Admin collegato al profilo operatore: ${masterWorker.name}`);
    } else {
      // Se l'admin esiste già ma non ha un workerId associato, lo agganciamo
      if (!existingAdmin.workerId && masterWorker) {
        existingAdmin.workerId = masterWorker._id;
        await existingAdmin.save();
        console.log(`🔗 Admin esistente aggiornato con workerId: ${masterWorker._id}`);
      } else {
        console.log(`ℹ️ Admin (${adminEmail}) già presente e configurato.`);
      }
    }

    // 3. Controllo Servizi (inseriti solo se il listino è vuoto)
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      await Service.create([
        {
          name: 'Taglio Capelli & Styling',
          description: 'Consulenza, lavaggio, taglio forbice/macchinetta e asciugatura.',
          durationMinutes: 30,
          price: 22.0,
          category: 'Capelli'
        },
        {
          name: 'Rasatura Barba Tradizionale',
          description: 'Panno caldo, olio pre-rasatura, rasoio a mano libera e dopobarba.',
          durationMinutes: 30,
          price: 18.0,
          category: 'Barba'
        },
        {
          name: 'Combo Taglio + Barba',
          description: 'Trattamento completo testa e barba con panno caldo.',
          durationMinutes: 60,
          price: 35.0,
          category: 'Completo'
        }
      ]);
      console.log('✂️ Listino servizi iniziale inserito.');
    } else {
      console.log(`ℹ️ Listino servizi già presente (${serviceCount} servizi trovati).`);
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