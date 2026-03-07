

import { Router } from 'express';
import { authorize } from '../../middlewares/auth.middleware.js';
import { SubscriptionControllerClass } from './subscription.controller.js';
import  express  from 'express';


export function createSubscriptionRoutes(controller: SubscriptionControllerClass): Router {
  const router = Router();



  // Post creation (requires authentication and file upload)

  router.post(
    '/create-order',
    authorize,
   
    controller.initateOrder,
  );

  //get all posts with pagination and limit
  router.post("/verify-payment", authorize, controller.verifyPaymentAndActivateSubscription);
  router.post("/webhook/razorpay", express.raw({type:"application/json"}), controller.webhookHandler);
  router.get("/plans", controller.getPlans);
  // get posts by query endpoing  

  return router;
}
