import Service from '../models/Service.js';

// GET /api/services (Pubblico - Solo servizi attivi per la prenotazione)
export const getActiveServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ price: 1 });
    res.json(services);
  } catch (error) {
    console.error('Errore getActiveServices:', error);
    res.status(500).json({ error: 'Impossibile recuperare i servizi.' });
  }
};

// GET /api/admin/services (Admin - Tutti i servizi)
export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json(services);
  } catch (error) {
    console.error('Errore getAllServices:', error);
    res.status(500).json({ error: 'Impossibile recuperare i servizi.' });
  }
};

// POST /api/admin/services (Admin - Creazione nuovo servizio)
export const createService = async (req, res) => {
  try {
    const { name, description, durationMinutes, price } = req.body;

    if (!name || !durationMinutes || price === undefined) {
      return res.status(400).json({ error: 'Nome, durata e prezzo sono obbligatori.' });
    }

    const service = await Service.create({
      name,
      description: description || '',
      durationMinutes: Number(durationMinutes),
      price: Number(price)
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Errore createService:', error);
    res.status(400).json({ error: 'Dati inseriti non validi.' });
  }
};

// PUT /api/admin/services/:id (Admin - Modifica servizio esistente)
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedService = await Service.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updatedService) {
      return res.status(404).json({ error: 'Servizio non trovato.' });
    }

    res.json(updatedService);
  } catch (error) {
    console.error('Errore updateService:', error);
    res.status(400).json({ error: 'Errore durante la modifica del servizio.' });
  }
};

// DELETE /api/admin/services/:id (Admin - Eliminazione logica o fisica)
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return res.status(404).json({ error: 'Servizio non trovato.' });
    }

    res.json({ success: true, message: 'Servizio rimosso con successo.' });
  } catch (error) {
    console.error('Errore deleteService:', error);
    res.status(500).json({ error: 'Errore durante la cancellazione del servizio.' });
  }
};