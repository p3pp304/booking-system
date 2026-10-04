import mongoose from 'mongoose';
import Worker from '../models/Worker.js';
import User from '../models/User.js';

// GET /api/workers
// Pubblico: solo operatori attivi e NON cancellati per il wizard di prenotazione
export const getActiveWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({ isActive: true, isDeleted: false })
      .select('name color')
      .sort({ name: 1 });

    return res.status(200).json(workers);
  } catch (error) {
    console.error('Errore getActiveWorkers:', error);
    return res.status(500).json({ error: 'Impossibile recuperare gli operatori.' });
  }
};

// GET /api/admin/workers
// Admin: tutti gli operatori in organico (esclusi quelli eliminati via soft-delete)
export const getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({ isDeleted: false }).sort({ name: 1 });
    return res.status(200).json(workers);
  } catch (error) {
    console.error('Errore getAllWorkers:', error);
    return res.status(500).json({ error: 'Impossibile recuperare gli operatori.' });
  }
};

// POST /api/admin/workers
// Admin: Crea contemporaneamente Worker (agenda) e User (credenziali portale)
export const createWorker = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, color, email, password } = req.body;

    if (!name || !email || !password) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Nome, email e password sono obbligatori.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verifica se l'email esiste già
    const emailExists = await User.findOne({ email: normalizedEmail }).session(session);
    if (emailExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ error: 'Questa email è già associata a un account di sistema.' });
    }

    // 1. Crea il barbiere per l'agenda
    const [newWorker] = await Worker.create(
      [
        {
          name: name.trim(),
          color: color || '#2563eb',
          isActive: true,
          isDeleted: false,
        },
      ],
      { session }
    );

    // 2. Crea l'utenza staff collegata (hash bcrypt tramite hook pre('save') su User)
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'staff',
      workerId: newWorker._id,
    });
    await newUser.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: 'Barbiere e credenziali creati con successo.',
      worker: newWorker,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Errore creazione worker + user:', error);
    return res.status(500).json({ error: 'Errore interno durante la creazione del collaboratore.' });
  }
};

// PUT /api/admin/workers/:id
// Admin: Modifica anagrafica (nome, colore)
export const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const worker = await Worker.findOne({ _id: id, isDeleted: false });
    if (!worker) {
      return res.status(404).json({ error: 'Operatore non trovato o già rimosso.' });
    }

    if (name !== undefined) worker.name = name.trim();
    if (color !== undefined) worker.color = color;

    await worker.save();

    return res.status(200).json({
      message: 'Dati operatore aggiornati con successo.',
      worker,
    });
  } catch (error) {
    console.error('Errore updateWorker:', error);
    return res.status(400).json({ error: 'Errore durante l\'aggiornamento dell\'operatore.' });
  }
};

// PATCH /api/admin/workers/:id/toggle-active
// Toggle rapido presenza/pausa (inverte il valore di isActive)
export const toggleWorkerActive = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await Worker.findOne({ _id: id, isDeleted: false });

    if (!worker) {
      return res.status(404).json({ error: 'Operatore non trovato o già rimosso.' });
    }

    worker.isActive = !worker.isActive;
    await worker.save();

    return res.status(200).json({
      message: `Stato operatore aggiornato a: ${worker.isActive ? 'Attivo' : 'Non attivo'}`,
      worker,
    });
  } catch (error) {
    console.error('Errore toggleWorkerActive:', error);
    return res.status(500).json({ error: 'Errore nel cambio stato dell\'operatore.' });
  }
};

// DELETE /api/admin/workers/:id
// Admin: Soft-delete del Worker e revoca immediata delle credenziali di accesso
export const deleteWorker = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // 1. Soft-delete su Worker
    const worker = await Worker.findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false },
      { new: true, session }
    );

    if (!worker) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Barbiere non trovato.' });
    }

    // 2. Revoca immediata dell'accesso (cancella l'utenza User collegata)
    await User.findOneAndDelete({ workerId: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Barbiere rimosso e credenziali di accesso revocate con successo.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Errore eliminazione worker:', error);
    return res.status(500).json({ error: 'Errore durante la rimozione del barbiere.' });
  }
};