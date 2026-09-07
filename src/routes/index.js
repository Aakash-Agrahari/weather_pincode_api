import { Router } from 'express';
import weatherRoutes from './weather.routes.js';

const router = Router();

router.use('/api', weatherRoutes);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is up.
 */
router.get('/health', (req, res) => res.json({ status: 'ok' }));

export default router;
