import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { listActiveCategories } from '../controllers/category.controller.js';

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List active complaint categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Active categories retrieved successfully
 *       '401':
 *         description: Authentication required
 */
const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(listActiveCategories));

export default router;
