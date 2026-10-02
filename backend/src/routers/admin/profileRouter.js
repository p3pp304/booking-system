import express from 'express';
import {
  getMyProfile,
  updateMyProfile,
  changePassword
} from '../../controllers/AuthController.js';

const router = express.Router();

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.put('/change-password', changePassword);

export default router;