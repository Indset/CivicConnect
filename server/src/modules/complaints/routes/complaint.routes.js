import { Router } from 'express';
/**
 * @openapi
 * /complaints:
 *   post:
 *     tags: [Complaints]
 *     summary: Create a complaint
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateComplaintRequest'
 *     responses:
 *       '201':
 *         description: Complaint created successfully
 *   get:
 *     tags: [Complaints]
 *     summary: List complaints with filters and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Complaints retrieved successfully
 * /complaints/search:
 *   get:
 *     tags: [Complaints]
 *     summary: Search complaints
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Search results returned
 * /complaints/my:
 *   get:
 *     tags: [Complaints]
 *     summary: List current user's complaints
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User complaints retrieved successfully
 * /complaints/latest:
 *   get:
 *     tags: [Complaints]
 *     summary: Get latest complaints
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Latest complaints retrieved successfully
 * /complaints/{id}:
 *   get:
 *     tags: [Complaints]
 *     summary: Get a complaint by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Complaint retrieved successfully
 *   put:
 *     tags: [Complaints]
 *     summary: Update a complaint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateComplaintRequest'
 *     responses:
 *       '200':
 *         description: Complaint updated successfully
 *   delete:
 *     tags: [Complaints]
 *     summary: Delete a complaint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Complaint deleted successfully
 */
import { authenticate } from '../../auth/middleware/auth.middleware.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { create, getOne, latest, list, mine, remove, search, update } from '../controllers/complaint.controller.js';
import {
  validateComplaintId,
  validateComplaintQuery,
  validateCreateComplaint,
  validateUpdateComplaint,
} from '../validators/complaint.validator.js';
import { validate } from '../../../middlewares/validation/validation.middleware.js';
import { createComplaintSchema, updateComplaintSchema } from '../../../validators/complaint.validators.js';

const router = Router();
router.use(authenticate);

router.post('/', validate(createComplaintSchema), asyncHandler(create));
router.get('/', validateComplaintQuery, asyncHandler(list));
router.get('/search', validateComplaintQuery, asyncHandler(search));
router.get('/my', validateComplaintQuery, asyncHandler(mine));
router.get('/latest', validateComplaintQuery, asyncHandler(latest));
router.get('/:id', validateComplaintId, asyncHandler(getOne));
router.put('/:id', validateComplaintId, validate(updateComplaintSchema), asyncHandler(update));
router.delete('/:id', validateComplaintId, asyncHandler(remove));

export default router;
