import express from 'express';
import { chatWithAssistant } from '../controllers/chatController.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

router.post('/', optionalAuth, chatWithAssistant);

export default router;
