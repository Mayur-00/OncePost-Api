import { Logger } from 'winston';
import { RazorpayService } from '../razorpay/razorpay.services.js';
import { SubscriptionService } from './subscription.services.js';

import { asyncHandler } from '../../utils/asyncHandler.js';
import { RequestHandler, Request, Response } from 'express';
import { initateOrderSchema, verifyPaymentSchema } from './subscription.dto.js';
import { ApiError } from '../../utils/apiError.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { RazorpayWebhookSchema } from '../razorpay/razorpay.dto.js';
import { subscriptionExpirationQueue } from '../../queues/queues.js';
import { ExpireSubscriptionJobBody } from '../../workers/worker.types.js';

export class SubscriptionControllerClass {
  constructor(
    private subscriptionService: SubscriptionService,
    private razorpayServices: RazorpayService,
    private logger: Logger,
  ) {}

  initateOrder: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { plan_id } = initateOrderSchema.parse(req.body);
    const userid = req.user?.id;

    if (!userid) {
      throw new ApiError(401, 'unauthorized');
    }

    const plan = await this.subscriptionService.getSubscriptionPlanById(plan_id);

    if (!plan) {
      this.logger.error(`plan not found id: ${plan_id}`);
      throw new ApiError(404, 'plan not found');
    }

    const subscription = await this.subscriptionService.createSubscription(userid, plan);

    const createOrderResponse = await this.razorpayServices.createOrder(
      plan.price * 100,
      plan.currency,
      subscription.id,
      userid,
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          order: createOrderResponse.order,
          subscription_id: subscription.id,
          transaction_id: createOrderResponse.transaction_id,
        },
        'subscripton order created',
      ),
    );
  });

  verifyPaymentAndActivateSubscription: RequestHandler = asyncHandler(
    async (req: Request, res: Response) => {
      const { order_id, payment_id, payment_signature, transaction_id } = verifyPaymentSchema.parse(
        req.body,
      );

      const userid = req.user?.id;

      if (!userid) {
        throw new ApiError(401, 'unauthorized');
      }
      const transaction = await this.razorpayServices.getTransactionById(transaction_id);

      if (!transaction) {
        this.logger.error('transaction detailes not found');
        throw new ApiError(404, 'Transaction not found');
      }
      const isPaymentVerified =
      await  this.razorpayServices.varifyPaymentSignature(
          order_id,
          payment_id,
          payment_signature,
          transaction.id,
        );

      if (!isPaymentVerified) {
        this.logger.error(`the payment is not verified or currupt`);
        throw new ApiError(401, 'payment is not valid');
      }

      const subscription = await this.subscriptionService.handleSuccessfulPayment({
        transactionId: transaction.id,
        paymentId: payment_id,
      });

      this.logger.info(`subscription : ${subscription}`);

      if (!subscription) {
        this.logger.error('failed to update subscription');
        throw new ApiError(500, 'Internal Server Error');
      }

      const now = new Date();

      const delay = subscription.end_date.getTime() - now.getTime();
      if (delay < 0) {
        throw new ApiError(400, 'subscription expiration time must be in the future');
      }
     

      const jobData: ExpireSubscriptionJobBody = {
        subscriptionId: subscription.id,
        userId: userid,
      };
       const jobId = `expire-${subscription.id}`
      subscriptionExpirationQueue.add(`subscription-expire-${subscription.id}-${userid}`, jobData, {
        delay: delay,
        jobId: jobId,
      });

      this.logger.info(`Subscription Added To Queue By Controller, JobId : ${jobId} `);

      this.logger.info(`Subscription activated for transaction ${transaction.id}`);

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            user: req.user,
            transaction_id: transaction.id,
          },
          'payment conformed and subscription created',
        ),
      );
    },
  );

  webhookHandler: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      this.logger.error('Missing Razorpay webhook signature');
      throw new ApiError(400, 'Invalid webhook request');
    }

    const isValid = this.razorpayServices.verifyWebhookSignature(
      req.body, // Buffer
      signature,
    );

    if (!isValid) {
      this.logger.error('Invalid Razorpay webhook signature');
      throw new ApiError(400, 'Webhook signature verification failed');
    }

    const { event, payload } = RazorpayWebhookSchema.parse(req.body.toString());

    const eventId: string = payload.payment.entity.id;
    const eventType: string = event;

    this.logger.info(`Webhook received: ${eventType} | ${eventId}`);

    const alreadyProcessed = await this.razorpayServices.isWebookAlreadyProcessed(
      payload.payment.entity.order_id!,
    );

    if (alreadyProcessed) {
      this.logger.info(`Webhook already processed: ${eventId}`);
      return res.status(200).json({ status: 'already processed' });
    }

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;

      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;
      const amount = payment.amount;

      const transaction = await this.razorpayServices.getTransactionByOrderId(razorpayOrderId!);
      if (!transaction) {
        this.logger.error(`Transaction not found for order: ${razorpayOrderId}`);
        return res.status(200).json({ status: 'ignored' });
      }
      const userid = transaction.user_id;

      // 🚨 Amount validation
      if (transaction.amount !== amount) {
        this.logger.error(`Amount mismatch for transaction ${transaction.id}`);
        throw new ApiError(400, 'Amount mismatch');
      }

      // 🔥 5️⃣ Atomic Update (VERY IMPORTANT)
      const subscription = await this.subscriptionService.handleSuccessfulPayment({
        transactionId: transaction.id,
        paymentId: razorpayPaymentId,
      });

      if (!subscription) {
        this.logger.error('failed to update subscription');
        throw new ApiError(500, 'Internal Server Error');
      }

      const now = new Date();
      const delay = subscription.end_date.getTime() - now.getTime();
      if (delay < 0) {
        throw new ApiError(400, 'subscription expiration time must be in the future');
      }

      const jobData: ExpireSubscriptionJobBody = {
        subscriptionId: subscription.id,
        userId: userid,
      };
      const jobId = `expire-${subscription.id}`

      subscriptionExpirationQueue.add(`subscription-expire-${subscription.id}-${userid}`, jobData, {
        delay: delay,
        jobId: jobId,
      });

      this.logger.info(`Subscription Added To Queue By Webhook, JobId : ${jobId} `);

      this.logger.info(`Subscription activated for transaction ${transaction.id}`);
    } else if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      await this.subscriptionService.handleFailedPayment(razorpayOrderId!, eventId);

      this.logger.warn(`Payment failed for order: ${razorpayOrderId}`);
    } else {
      console.log('Unhandled webhook event:', event);
    }

    return res.status(200).json({ status: 'ok' });
  });

  getPlans: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const plan = await this.subscriptionService.getAllSubscriptionPlans();

    return res.status(200).json(new ApiResponse(200, plan, 'Success'));
  });
}
