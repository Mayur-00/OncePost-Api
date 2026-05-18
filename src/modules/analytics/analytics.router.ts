import { Router } from "express";

 // Adjust import to your architecture
import logger from "../../config/logger.config.js";
import { authorize } from "../../middlewares/auth.middleware.js";
import { AnalyticsController } from "./analytics.controller.js";

const router = Router();


export function createAnalyticsRoutes(controller: AnalyticsController): Router {
  const router = Router();

  // OAuth flow
  router.get('/platform-metrics', authorize, controller.getPlatformMetrics);
  router.get('/daily-post-metrics', authorize, controller.getPostConsistancyMatrics);

  return router;
}