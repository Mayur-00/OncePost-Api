import { Logger } from "winston";
import { RazorpayService } from "../razorpay/razorpay.services.js";
import { SubscriptionService } from "./subscription.services.js";

import { asyncHandler } from "../../utils/asyncHandler.js";
import { RequestHandler, Request, Response } from 'express';
import { initateOrderSchema, verifyPaymentSchema } from "./subscription.dto.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";



export class SubscriptionControllerClass {
    constructor(private subscriptionService:SubscriptionService,private razorpayServices:RazorpayService, private logger:Logger ){};

    initateOrder : RequestHandler = asyncHandler(async (req:Request, res:Response) => {
        const {plan_id} = initateOrderSchema.parse(req.body);
        const userid = req.user?.id;

        if(!userid){
            throw new ApiError(401, 'unauthorized')
        }


        const plan = await this.subscriptionService.getSubscriptionPlanById(plan_id);

        if(!plan){
            this.logger.error(`plan not found id: ${plan_id}`);
            throw new ApiError(404, 'plan not found')
        };

        const order = await this.razorpayServices.createOrder(plan.price *100, plan.currency);

        return res.status(201).json(new ApiResponse(201,{order:order, plan_id:plan.id}, 'subscripton order created' ))
    });

    verifyPaymentAndActivateSubscription :RequestHandler = asyncHandler(async (req:Request, res:Response) => {

        const { order_id,  payment_id, payment_signature, plan_id} = verifyPaymentSchema.parse(req.body);

        const userid = req.user?.id;

        if(!userid){
            throw new ApiError(401, 'unauthorized')
        }

        const plan  = await this.subscriptionService.getSubscriptionPlanById(plan_id);

        if(!plan) {
            this.logger.error(`plan not found with id : ${plan_id}`);
            throw new ApiError(404, 'plan not found');
        };

        const isPaymentVerified = this.razorpayServices.varifyPaymentSignature(order_id, payment_id, payment_signature);

        if(!isPaymentVerified){
            this.logger.error(`the payment is not verified or currupt`);
            throw new ApiError(401, 'payment is not valid')
        };

        const subscription = await this.subscriptionService.createSubscription(userid, plan.id);

        const transaction = await this.razorpayServices.saveTransactionInDb({user_id:userid, amount:plan.price, currency:plan.currency ,description:'transaction for subscription plan purchase', razorpay_order_id:order_id, razorpay_payment_id:payment_id, razorpay_signature:payment_signature ,status:'COMPLETED',subscription_id:subscription.id, type:"SUBSCRIPTION_UPGRADE" });

        return res.status(200).json(new ApiResponse(200, {
            user:req.user,
            subscription:subscription,
            transaction_id:transaction.id
        }, 'payment conformed and subscription created'))


    });
}