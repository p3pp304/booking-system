import express from 'express';
import {requireAdminOnly, verifyToken } from '../../middlewares/authMiddleware.js';
import { login } from '../../controllers/AuthController.js'; // Import diretto della funzione di login

import adminBookingRouter from './adminBookingRouter.js';
import adminServiceRouter from './adminServiceRouter.js';
import adminWorkerRouter from './adminWorkerRouter.js';
import profileRouter from './profileRouter.js'; 
import { getAdminRevenue } from '../../controllers/AdminRevenueController.js';

const adminRouter = express.Router();

// ----------------------------------------------------
// 1. ZONA APERTA (Nessun token richiesto)
// Endpoint: POST /api/admin/auth/login
// ----------------------------------------------------
adminRouter.post('/auth/login', login);

// 2. Barriera di sicurezza: TUTTO ciò che passa da questo router richiede autenticazione
adminRouter.use(verifyToken);

// 2. Sotto-rotte (i percorsi qui sono relativi a /api/admin)
adminRouter.use('/profile', profileRouter); 
adminRouter.use('/revenue', requireAdminOnly, getAdminRevenue );
adminRouter.use('/bookings', adminBookingRouter);
adminRouter.use('/services', adminServiceRouter);
adminRouter.use('/workers', adminWorkerRouter);

export default adminRouter;