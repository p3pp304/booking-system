import express from 'express';
import {
  getAllWorkers,
  createWorker,
  updateWorker,
  toggleWorkerActive,
  deleteWorker,
} from '../../controllers/WorkerController.js';
import { verifyToken, requireAdminOnly } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/admin/workers
 * @desc    Recupera l'elenco completo dello staff (esclusi solo i soft-deleted)
 * @access  Staff & Admin autenticati
 */
router.get('/', getAllWorkers);

/**
 * @route   PATCH /api/admin/workers/:id/toggle-active
 * @desc    Toggle rapido presenza/pausa/ferie (inverte isActive)
 * @access  Staff & Admin autenticati
 */
router.patch('/:id/toggle-active', toggleWorkerActive);

/**
 * @route   POST /api/admin/workers
 * @desc    Crea Worker (colonna agenda) e utenza User (credenziali login) in transazione
 * @body    name, color, email, password
 * @access  Solo Admin
 */
router.post('/', requireAdminOnly, createWorker);

/**
 * @route   PUT /api/admin/workers/:id
 * @desc    Modifica anagrafica barbiere (nome, colore agenda)
 * @params  id (ObjectId del Worker)
 * @body    name, color
 * @access  Solo Admin
 */
router.put('/:id', requireAdminOnly, updateWorker);

/**
 * @route   DELETE /api/admin/workers/:id
 * @desc    Soft-delete del barbiere (isDeleted: true) e revoca credenziali User
 * @params  id (ObjectId del Worker)
 * @access  Solo Admin
 */
router.delete('/:id', requireAdminOnly, deleteWorker);

export default router;