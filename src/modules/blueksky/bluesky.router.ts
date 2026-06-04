import { Router } from 'express';
import { authorize } from '../../middlewares/auth.middleware.js';
import { BlueskyControllerClass } from './bluesky.controller.js';

export function createBlueskyRoutes(controller: BlueskyControllerClass): Router {
  const router = Router();

  router.post('/connect', authorize, controller.HandleLogin);

  return router;
}
