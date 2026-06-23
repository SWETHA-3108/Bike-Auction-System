import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from '../validation.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
