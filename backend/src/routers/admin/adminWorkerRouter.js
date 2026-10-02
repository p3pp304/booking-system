import express from 'express';
import {
  getAllWorkers,
  createWorker,
  updateWorker,
  deleteWorker
} from '../../controllers/WorkerController.js';
import { requireAdminOnly } from '../../middlewares/authMiddleware.js';
const router = express.Router();

/**
 * @route   GET /api/admin/workers
 * @desc    Recupera l'elenco completo dello staff (inclusi disattivati/in ferie e recapiti privati)
 */
router.get('/', getAllWorkers);

/**
 * @route   POST /api/admin/workers
 * @desc    Aggiunge un nuovo operatore/barbiere all'organico
 * @body    name (obbligatorio), phone, photoUrl, bio, isActive
 */
router.post('/', requireAdminOnly,createWorker);

/**
 * @route   PUT /api/admin/workers/:id
 * @desc    Modifica i dati di un operatore o il suo stato (es: attiva/disattiva per ferie)
 * @params  id (ObjectId dell'operatore)
 * @body    name, phone, photoUrl, bio, isActive
 */
router.put('/:id',requireAdminOnly, updateWorker);

/**
 * @route   DELETE /api/admin/workers/:id
 * @desc    Disattiva l'operatore (soft-delete impostando isActive: false per preservare lo storico prenotazioni)
 * @params  id (ObjectId dell'operatore)
 */
router.delete('/:id',requireAdminOnly, deleteWorker);

export default router;