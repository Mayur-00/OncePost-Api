import { Router } from 'express';

import { authorize } from '../../middlewares/auth.middleware.js';
import { XController } from './x.controller.js';

export function createXRoutes(controller: XController): Router {
  const router = Router();

  // OAuth flow
  router.get('/callback', controller.handleCallback);
  router.post('/auth', authorize, controller.getAuth);

  return router;
}
