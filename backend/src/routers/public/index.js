import express from 'express';
import bookingRouter from './clientBookingRouter.js';
import serviceRouter from './clientServiceRouter.js';
import workerRouter from './clientWorkerRouter.js';

const publicRouter = express.Router();

// Nessun auth middleware qui
publicRouter.use('/bookings', bookingRouter);
publicRouter.use('/services', serviceRouter);
publicRouter.use('/workers', workerRouter);

export default publicRouter;