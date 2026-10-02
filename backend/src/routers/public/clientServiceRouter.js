import express from 'express';
import {
  getActiveServices,
} from '../../controllers/ServiceController.js';

const router = express.Router();

// Rotta cliente
router.get('/', getActiveServices);

export default router;