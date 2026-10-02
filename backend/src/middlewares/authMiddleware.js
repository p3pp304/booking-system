import jwt from 'jsonwebtoken';

/**
 * Verifica il token JWT per tutto il personale (admin + staff)
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Accesso negato. Autenticazione richiesta.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token non valido o assente.' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: JWT_SECRET mancante nelle variabili d\'ambiente!');
      return res.status(500).json({ error: 'Errore interno di configurazione sicurezza.' });
    }

    const decoded = jwt.verify(token, secret || 'super_secret_jwt_key');

    const allowedRoles = ['admin', 'staff'];
    if (!decoded.role || !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Accesso riservato al personale autorizzato.' });
    }

    // Inietta payload: { userId, role, name, ... }
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessione scaduta. Effettua nuovamente il login.' });
    }
    return res.status(403).json({ error: 'Token non valido o manomesso.' });
  }
};

/**
 * Middleware facoltativo per rotte sensibili (prezzi, staff, capienza)
 */
export const requireAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Azione consentita esclusivamente all\'amministratore del salone.'
    });
  }
  next();
};

export const authMiddleware = verifyToken;