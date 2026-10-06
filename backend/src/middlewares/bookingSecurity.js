// middleware/bookingSecurity.js
import Booking from '../models/Booking.js';

export const checkBookingOwnership = async (req, res, next) => {
  try {
    const user = req.user; // Iniettato dal middleware JWT
    const { id } = req.params;

    // Gli admin hanno accesso universale
    if (user.role === 'admin') {
      return next();
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Appuntamento non trovato.' });
    }

    const userWorkerId = String(user.workerId || user._id);
    const bookingWorkerId = String(booking.workerId);

    // Blocca se non c'è corrispondenza né di ID né di nome
    const isOwner = bookingWorkerId === userWorkerId || 
                    (booking.workerName && user.name && booking.workerName.toLowerCase() === user.name.toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ 
        message: 'Accesso negato: non puoi modificare gli appuntamenti di un altro barbiere.' 
      });
    }

    // Salva il booking trovato su req per non rifare findById nel controller
    req.targetBooking = booking;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Errore durante la verifica dei permessi.' });
  }
};

// middlewares/bookingSecurity.js

export const checkWorkerAssignment = (req, res, next) => {
  const user = req.user;

  // L'admin può assegnare a chiunque
  if (user?.role === 'admin') {
    return next();
  }

  const requestedWorkerId = req.body.workerId;
  const userWorkerId = user.workerId || user.id || user._id;

  // Se lo staff prova ad assegnare un booking a un altro collaboratore
  if (requestedWorkerId && String(requestedWorkerId) !== String(userWorkerId)) {
    return res.status(403).json({
      message: 'Accesso negato: puoi inserire slot e blocchi solo sulla tua postazione.'
    });
  }

  // Se non specifica il workerId, forzalo sul suo
  if (!requestedWorkerId) {
    req.body.workerId = userWorkerId;
  }

  next();
};