import Worker from '../models/Worker.js';

// GET /api/workers (Pubblico - Operatori attivi per il selettore nel wizard)
export const getActiveWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({ isActive: true })
      .select('name skills')
      .populate('skills', 'name');
    res.json(workers);
  } catch (error) {
    console.error('Errore getActiveWorkers:', error);
    res.status(500).json({ error: 'Impossibile recuperare gli operatori.' });
  }
};

// GET /api/admin/workers (Admin - Tutti gli operatori)
export const getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().populate('skills', 'name');
    res.json(workers);
  } catch (error) {
    console.error('Errore getAllWorkers:', error);
    res.status(500).json({ error: 'Impossibile recuperare gli operatori.' });
  }
};

// POST /api/admin/workers (Admin - Aggiungi operatore)
export const createWorker = async (req, res) => {
  try {
    const { name, phone, skills } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Il nome dell\'operatore è obbligatorio.' });
    }

    const worker = await Worker.create({
      name,
      phone: phone || '',
      skills: skills || []
    });

    res.status(201).json(worker);
  } catch (error) {
    console.error('Errore createWorker:', error);
    res.status(400).json({ error: 'Dati operatore non validi.' });
  }
};

// PUT /api/admin/workers/:id (Admin - Modifica anagrafica o stato)
export const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;

    // Impedisce la modifica se il barbiere è marcato come eliminato definitivamente
    const worker = await Worker.findOne({ _id: id, isDeleted: false });
    if (!worker) {
      return res.status(404).json({ error: 'Operatore non trovato o già rimosso.' });
    }

    // Aggiorna solo i campi permessi (nome, color, isActive)
    const { name, color, isActive } = req.body;
    if (name !== undefined) worker.name = name;
    if (color !== undefined) worker.color = color;
    if (isActive !== undefined) worker.isActive = isActive;

    await worker.save();

    res.json({
      success: true,
      message: 'Dati operatore aggiornati con successo.',
      worker
    });
  } catch (error) {
    console.error('Errore updateWorker:', error);
    res.status(400).json({ error: 'Errore durante l\'aggiornamento dell\'operatore.' });
  }
};

// DELETE /api/admin/workers/:id (Admin - Disattivazione logica operatore)
export const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;

    // Blocca se ci sono appuntamenti futuri ancora in carico
    const futureBookings = await Booking.countDocuments({
      workerId: id,
      startTime: { $gte: new Date() },
      status: { $in: ['confirmed', 'pending'] }
    });

    if (futureBookings > 0) {
      return res.status(400).json({
        error: `Impossibile rimuovere l'operatore: ci sono ${futureBookings} appuntamenti futuri da gestire.`
      });
    }

    // Marca come rimosso
    const worker = await Worker.findByIdAndUpdate(
      id,
      { isActive: false, isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ error: 'Operatore non trovato.' });
    }

    res.json({ success: true, message: 'Operatore rimosso con successo dall\'organico.' });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante la rimozione dell\'operatore.' });
  }
};