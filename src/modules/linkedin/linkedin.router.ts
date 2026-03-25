import { Router } from 'express';
import { LinkedinController } from './linkedin.controller.js';
import { authorize } from '../../middlewares/auth.middleware.js';

export function createLinkedInRoutes(controller: LinkedinController): Router {
  const router = Router();

  // OAuth flow
  router.get('/auth', authorize, controller.startAuth);
  router.get('/callback', controller.handleLinkedinAuthCallback);

  return router;
}
