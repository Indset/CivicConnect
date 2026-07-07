import { Router } from 'express';
/**
 * @openapi
 * /uploads/single:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a single image
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '201':
 *         description: Image uploaded successfully
 * /uploads/multiple:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload multiple images
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '201':
 *         description: Images uploaded successfully
 * /uploads/{publicId}:
 *   put:
 *     tags: [Uploads]
 *     summary: Replace an uploaded image
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Image replaced successfully
 *   delete:
 *     tags: [Uploads]
 *     summary: Delete an uploaded image
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Image deleted successfully
 */
import { authenticate } from '../../auth/middleware/auth.middleware.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  uploadMultipleImagesWithValidation,
  uploadSingleImageWithValidation,
} from '../middleware/upload.middleware.js';
import {
  cleanupUnusedImages,
  deleteImage,
  replaceImage,
  uploadMultiple,
  uploadSingle,
} from '../controllers/upload.controller.js';

const router = Router();
router.use(authenticate);

router.post('/single', uploadSingleImageWithValidation, asyncHandler(uploadSingle));
router.post('/multiple', uploadMultipleImagesWithValidation, asyncHandler(uploadMultiple));
router.delete('/:publicId', asyncHandler(deleteImage));
router.put('/:publicId', uploadSingleImageWithValidation, asyncHandler(replaceImage));
router.post('/cleanup', asyncHandler(cleanupUnusedImages));

export default router;
