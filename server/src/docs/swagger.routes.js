import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec, swaggerUiConfig } from './swagger.js';

const router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, swaggerUiConfig));

export default router;
