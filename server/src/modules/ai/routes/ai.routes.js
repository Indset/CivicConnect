import { Router } from "express";
import rateLimit from "express-rate-limit";
import Joi from "joi";
import { authenticate } from "../../auth/middleware/auth.middleware.js";
import { validate } from "../../../middlewares/validation/validation.middleware.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { suggestCategory } from "../controllers/ai.controller.js";

/**
 * @openapi
 * /ai/suggest-category:
 *   post:
 *     tags: [AI]
 *     summary: Suggest a complaint category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *     responses:
 *       '200':
 *         description: Suggested category returned
 *       '401':
 *         description: Authentication required
 *       '429':
 *         description: Suggestion rate limit exceeded
 */
const router = Router();
const suggestionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many category suggestion requests, please try again shortly",
  },
});
const suggestionSchema = Joi.object({
  title: Joi.string().trim().min(5).max(150).required(),
  description: Joi.string().trim().min(10).max(5000).required(),
}).unknown(false);

router.use(authenticate);
router.post(
  "/suggest-category",
  suggestionRateLimit,
  validate(suggestionSchema),
  asyncHandler(suggestCategory),
);

export default router;
