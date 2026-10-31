import { Router } from "express";
import { authenticate } from "../../auth/middleware/auth.middleware.js";
import { adminOnly } from "../../admin/middleware/admin.middleware.js";
import { optionalAuthenticate } from "../middleware/optional-auth.middleware.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { validate } from "../../../middlewares/validation/validation.middleware.js";
import {
  createDriveHandler,
  createTipHandler,
  deleteDriveHandler,
  deleteTipHandler,
  getDriveHandler,
  getTipHandler,
  joinDriveHandler,
  leaveDriveHandler,
  listDrivesHandler,
  listTipsHandler,
  updateDriveHandler,
  updateTipHandler,
} from "../controllers/awareness.controller.js";
import {
  createDriveSchema,
  createTipSchema,
  updateDriveSchema,
  updateTipSchema,
  validateAwarenessId,
  validateAwarenessListQuery,
} from "../validators/awareness.validator.js";

/**
 * @openapi
 * /awareness/tips:
 *   get:
 *     tags: [Awareness]
 *     summary: List civic sense tips
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Cleanliness, Traffic, Water, Noise, Public property]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       '200':
 *         description: Tips retrieved
 *   post:
 *     tags: [Awareness]
 *     summary: Create a civic sense tip (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '201':
 *         description: Tip created
 * /awareness/tips/{id}:
 *   get:
 *     tags: [Awareness]
 *     summary: Get a civic sense tip
 *     security: []
 *     responses:
 *       '200':
 *         description: Tip retrieved
 *   put:
 *     tags: [Awareness]
 *     summary: Update a civic sense tip (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Tip updated
 *   delete:
 *     tags: [Awareness]
 *     summary: Delete a civic sense tip (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Tip deleted
 * /awareness/drives:
 *   get:
 *     tags: [Awareness]
 *     summary: List cleanliness drives
 *     security: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, completed]
 *     responses:
 *       '200':
 *         description: Drives retrieved
 *   post:
 *     tags: [Awareness]
 *     summary: Create a cleanliness drive (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '201':
 *         description: Drive created
 * /awareness/drives/{id}:
 *   get:
 *     tags: [Awareness]
 *     summary: Get a cleanliness drive
 *     security: []
 *     responses:
 *       '200':
 *         description: Drive retrieved
 *   put:
 *     tags: [Awareness]
 *     summary: Update a cleanliness drive (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Drive updated
 *   delete:
 *     tags: [Awareness]
 *     summary: Delete a cleanliness drive (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Drive deleted
 * /awareness/drives/{id}/join:
 *   post:
 *     tags: [Awareness]
 *     summary: Join an upcoming cleanliness drive
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Joined drive
 * /awareness/drives/{id}/leave:
 *   post:
 *     tags: [Awareness]
 *     summary: Leave a cleanliness drive
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Left drive
 */
const router = Router();

router.get("/tips", validateAwarenessListQuery, asyncHandler(listTipsHandler));
router.get("/tips/:id", validateAwarenessId, asyncHandler(getTipHandler));
router.post(
  "/tips",
  authenticate,
  adminOnly,
  validate(createTipSchema),
  asyncHandler(createTipHandler),
);
router.put(
  "/tips/:id",
  authenticate,
  adminOnly,
  validateAwarenessId,
  validate(updateTipSchema),
  asyncHandler(updateTipHandler),
);
router.delete(
  "/tips/:id",
  authenticate,
  adminOnly,
  validateAwarenessId,
  asyncHandler(deleteTipHandler),
);

router.get(
  "/drives",
  optionalAuthenticate,
  validateAwarenessListQuery,
  asyncHandler(listDrivesHandler),
);
router.get(
  "/drives/:id",
  optionalAuthenticate,
  validateAwarenessId,
  asyncHandler(getDriveHandler),
);
router.post(
  "/drives/:id/join",
  authenticate,
  validateAwarenessId,
  asyncHandler(joinDriveHandler),
);
router.post(
  "/drives/:id/leave",
  authenticate,
  validateAwarenessId,
  asyncHandler(leaveDriveHandler),
);
router.post(
  "/drives",
  authenticate,
  adminOnly,
  validate(createDriveSchema),
  asyncHandler(createDriveHandler),
);
router.put(
  "/drives/:id",
  authenticate,
  adminOnly,
  validateAwarenessId,
  validate(updateDriveSchema),
  asyncHandler(updateDriveHandler),
);
router.delete(
  "/drives/:id",
  authenticate,
  adminOnly,
  validateAwarenessId,
  asyncHandler(deleteDriveHandler),
);

export default router;
