import express from 'express';
import { getActiveWorkers } from '../../controllers/WorkerController.js';

const router = express.Router();

/**
 * @route   GET /api/workers
 * @desc    Lista pubblica dei soli barbieri attivi (id, nome, foto, bio)
 *          Utilizzato nel form di prenotazione cliente ("Con chi vuoi tagliare?")
 */
router.get('/', getActiveWorkers);

export default router;