import { Router } from 'express';
import { authorize } from '../../middlewares/auth.middleware.js';
import { AnalyticsController } from './analytics.controller.js';

export function createAnalyticsRoutes(controller: AnalyticsController): Router {
  const router = Router();

  // OAuth flow
  router.get('/platform-metrics', authorize, controller.getPlatformMetrics);
  router.get('/daily-post-metrics', authorize, controller.getPostConsistancyMatrics);

  return router;
}
