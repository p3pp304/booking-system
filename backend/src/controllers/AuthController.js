import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Worker from '../models/Worker.js';

/**
 * 1. LOGIN (Staff & Admin)
 * Non richiede token
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenziali non valide.' });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key';
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        id: user._id.toString(),
        workerId: user.workerId?.toString() || null,
        role: user.role,
        name: user.name,
      },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workerId: user.workerId?.toString() || null,
      }
    });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ error: 'Errore durante l\'accesso.' });
  }
};

/**
 * 2. PROFILO PERSONALE (GET /api/admin/profile/me)
 * Richiede token -> legge req.user.userId
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato.' });
    }

    let workerData = null;
    if (user.workerId) {
      workerData = await Worker.findById(user.workerId);
    }

    res.json({
      success: true,
      user,
      worker: workerData
    });
  } catch (error) {
    console.error('Errore getMyProfile:', error);
    res.status(500).json({ error: 'Errore recupero profilo.' });
  }
};

/**
 * 3. AGGIORNAMENTO PROFILO (PUT /api/admin/profile/me)
 * Modifica solo i propri dati di visualizzazione
 */
export const updateMyProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato.' });
    }

    if (name) user.name = name.trim();
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const emailExists = await User.exists({ email: normalizedEmail, _id: { $ne: user._id } });
        if (emailExists) {
          return res.status(409).json({ error: 'Questa email è già associata a un account.' });
        }
        user.email = normalizedEmail;
      }
    }
    if (phone !== undefined) user.phone = phone.trim();
    await user.save();

    if (user.workerId) {
      const allowedWorkerUpdates = {};
      if (name) allowedWorkerUpdates.name = name.trim();

      await Worker.findByIdAndUpdate(user.workerId, allowedWorkerUpdates);
    }

    res.json({ success: true, message: 'Profilo aggiornato con successo.' });
  } catch (error) {
    console.error('Errore updateMyProfile:', error);
    res.status(500).json({ error: 'Errore aggiornamento profilo.' });
  }
};

/**
 * 4. CAMBIO PASSWORD (PUT /api/admin/profile/change-password)
 * Richiede token
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId).select('+password');

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'La password attuale non è corretta.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password aggiornata con successo.' });
  } catch (error) {
    console.error('Errore changePassword:', error);
    res.status(500).json({ error: 'Errore aggiornamento password.' });
  }
};