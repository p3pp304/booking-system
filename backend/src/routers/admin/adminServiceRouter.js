import express from 'express';
import {
  getAllServices,
  createService,
  updateService,
  deleteService
} from '../../controllers/ServiceController.js';
import { requireAdminOnly } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Rotte Admin
router.get('/all',getAllServices);
router.post('/', requireAdminOnly, createService);
router.put('/:id', requireAdminOnly, updateService);
router.delete('/:id', requireAdminOnly, deleteService);

export default router;