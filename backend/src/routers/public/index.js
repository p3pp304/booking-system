import express from 'express';
import bookingRouter from './clientBookingRouter.js';
import serviceRouter from './clientServiceRouter.js';
import workerRouter from './clientWorkerRouter.js';
import businessConfig from "../../config/business.config.js";

const publicRouter = express.Router();

// Nessun auth middleware qui

publicRouter.use('/bookings', bookingRouter);
publicRouter.use('/services', serviceRouter);
publicRouter.use('/workers', workerRouter);


// Endpoint pubblico per la vetrina
publicRouter.get('/config', (req, res) => {
  res.json({
    business: businessConfig.business,
    weeklySchedule: businessConfig.weeklySchedule,
    bookingRules: {
      slotIntervalMinutes: businessConfig.bookingRules.slotIntervalMinutes,
      allowWorkerSelection: businessConfig.bookingRules.allowWorkerSelection,
      defaultWorkerOptionLabel: businessConfig.bookingRules.defaultWorkerOptionLabel,
    }
  });
});

export default publicRouter;