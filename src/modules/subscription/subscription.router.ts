

import { Router } from 'express';
import { authorize } from '../../middlewares/auth.middleware.js';
import { SubscriptionControllerClass } from './subscription.controller.js';


export function createSubscriptionRoutes(controller: SubscriptionControllerClass): Router {
  const router = Router();



  // Post creation (requires authentication and file upload)

  router.post(
    '/create-order',
    authorize,
   
    controller.initateOrder,
  );

  //get all posts with pagination and limit
  router.get("/verify-payment", authorize, controller.verifyPaymentAndActivateSubscription);
  // get posts by query endpoing  

  return router;
}
