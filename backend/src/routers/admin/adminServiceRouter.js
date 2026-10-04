import express from 'express';
import {
  getAllServices,
  createService,
  updateService,
  deleteService
} from '../../controllers/ServiceController.js';
import { requireAdminOnly } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/admin/services/all
 * @desc    Elenco completo di tutti i servizi per il gestionale
 * @access  Staff & Admin autenticati
 */
router.get('/all', getAllServices);

/**
 * Operazioni di scrittura/modifica: Riservate ESCLUSIVAMENTE all'Admin
 */
router.post('/', requireAdminOnly, createService);
router.put('/:id', requireAdminOnly, updateService);
router.delete('/:id', requireAdminOnly, deleteService);

export default router;