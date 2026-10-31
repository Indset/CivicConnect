import { Router } from 'express';
/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Dashboard data retrieved successfully
 * /admin/complaints:
 *   get:
 *     tags: [Admin]
 *     summary: View all complaints as admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Complaints retrieved successfully
 * /admin/complaints/{id}/assign:
 *   post:
 *     tags: [Admin]
 *     summary: Assign a complaint to a user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Complaint assigned successfully
 * /admin/complaints/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Update complaint status
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
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [submitted, under_review, assigned, in_progress, resolved, rejected, closed]
 *               note:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       '200':
 *         description: Status updated successfully
 * /admin/complaints/{id}/remarks:
 *   post:
 *     tags: [Admin]
 *     summary: Add a remark to a complaint
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Remark added successfully
 * /admin/categories:
 *   post:
 *     tags: [Admin]
 *     summary: Create a category
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '201':
 *         description: Category created successfully
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Users retrieved successfully
 * /admin/analytics/monthly:
 *   get:
 *     tags: [Admin]
 *     summary: Get monthly complaint analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Analytics retrieved successfully
 */
import Joi from 'joi';
import { authenticate } from '../../auth/middleware/auth.middleware.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { adminOnly } from '../middleware/admin.middleware.js';
import {
  activateCategory,
  activateUserHandler,
  addRemark,
  assignComplaint,
  changeStatus,
  changeUserRoleHandler,
  createCategoryHandler,
  deactivateCategory,
  deleteComplaint,
  getCategoryStatsHandler,
  getDashboard,
  getMonthlyStats,
  getPriorityStatsHandler,
  getStatusStatsHandler,
  listComplaints,
  listUsersHandler,
  removeCategory,
  suspendUserHandler,
  updateCategoryHandler,
} from '../controllers/admin.controller.js';
import {
  validateAdminComplaintQuery,
  validateCategoryId,
  validateUserId,
  validateUserQuery,
} from '../validators/admin.validator.js';
import { validate } from '../../../middlewares/validation/validation.middleware.js';
import { assignComplaintSchema, updateComplaintStatusSchema } from '../../../validators/complaint.validators.js';
import { createCategorySchema, updateCategorySchema } from '../../../validators/category.validators.js';
import { createNotificationSchema } from '../../../validators/notification.validators.js';

const router = Router();
router.use(authenticate, adminOnly);

router.get('/dashboard', asyncHandler(getDashboard));
router.get('/complaints', validateAdminComplaintQuery, asyncHandler(listComplaints));
router.post('/complaints/:id/assign', validate(assignComplaintSchema), asyncHandler(assignComplaint));
router.patch('/complaints/:id/status', validate(updateComplaintStatusSchema), asyncHandler(changeStatus));
router.post('/complaints/:id/remarks', validate(createNotificationSchema), asyncHandler(addRemark));
router.delete('/complaints/:id', asyncHandler(deleteComplaint));

router.post('/categories', validate(createCategorySchema), asyncHandler(createCategoryHandler));
router.get('/categories', asyncHandler(async (_req, res) => {
  const { default: Category } = await import('../../categories/models/category.model.js');
  const categories = await Category.find().sort({ createdAt: -1 }).lean();
  return res.status(200).json({ success: true, statusCode: 200, message: 'Categories retrieved successfully', data: { categories } });
}));
router.patch('/categories/:id/activate', validateCategoryId, asyncHandler(activateCategory));
router.patch('/categories/:id/deactivate', validateCategoryId, asyncHandler(deactivateCategory));
router.patch('/categories/:id', validateCategoryId, validate(updateCategorySchema), asyncHandler(updateCategoryHandler));
router.delete('/categories/:id', validateCategoryId, asyncHandler(removeCategory));

router.get('/users', validateUserQuery, asyncHandler(listUsersHandler));
router.patch('/users/:id/suspend', validateUserId, asyncHandler(suspendUserHandler));
router.patch('/users/:id/activate', validateUserId, asyncHandler(activateUserHandler));
router.patch('/users/:id/role', validateUserId, validate(Joi.object({ role: Joi.string().valid('citizen', 'admin').required() }).required()), asyncHandler(changeUserRoleHandler));

router.get('/analytics/monthly', asyncHandler(getMonthlyStats));
router.get('/analytics/categories', asyncHandler(getCategoryStatsHandler));
router.get('/analytics/status', asyncHandler(getStatusStatsHandler));
router.get('/analytics/priority', asyncHandler(getPriorityStatsHandler));

export default router;
