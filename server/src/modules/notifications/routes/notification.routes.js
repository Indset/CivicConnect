import { Router } from 'express';
/**
 * @openapi
 * /notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Create a notification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '201':
 *         description: Notification created successfully
 *   get:
 *     tags: [Notifications]
 *     summary: Get notifications for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Notifications retrieved successfully
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Unread count retrieved successfully
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: All notifications marked as read
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Notification marked as read
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Notification deleted successfully
 */
import { authenticate } from '../../auth/middleware/auth.middleware.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validate } from '../../../middlewares/validation/validation.middleware.js';
import { createNotificationSchema } from '../../../validators/notification.validators.js';
import { create, list, markAllRead, markSingleRead, remove, unreadCount } from '../controllers/notification.controller.js';
import { validateNotificationId, validateNotificationQuery } from '../validators/notification.validator.js';

const router = Router();
router.use(authenticate);

router.post('/', validate(createNotificationSchema), asyncHandler(create));
router.get('/', validateNotificationQuery, asyncHandler(list));
router.get('/unread-count', asyncHandler(unreadCount));
router.patch('/read-all', asyncHandler(markAllRead));
router.patch('/:id/read', validateNotificationId, asyncHandler(markSingleRead));
router.delete('/:id', validateNotificationId, asyncHandler(remove));

export default router;
