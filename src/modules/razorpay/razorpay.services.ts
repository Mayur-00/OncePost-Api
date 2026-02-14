import { Logger } from 'winston';
import {
  PlatformPost,
  PlatfromPostStatus,
  Post,
  PrismaClient,
  SocialAccount,
  Transaction,
} from '../../generated/prisma/client.js';
import Razorpay from 'razorpay';
import { ApiError } from '../../utils/apiError.js';
import { Orders } from 'razorpay/dist/types/orders.js';
import crypto from 'crypto';
import { createTransactionTypes } from './razorpay.services.types.js';
import { openSync } from 'fs';

export class RazorpayService {
  constructor(
    private prismaClient: PrismaClient,
    private logger: Logger,
    private razorpay: Razorpay,
  ) {};

  async createOrder(
    amount: number,
    currency: string,
    reciept?: string,
  ): Promise<Orders.RazorpayOrder> {
    try {
      const options = {
        amount,
        currency,
        reciept,
      };
      const rxp = await this.razorpay.orders.create(options);
      this.logger.info('razorpay order created');
      return rxp;
    } catch (error) {
      this.logger.error(`failed to create razorpay order : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  };

  generatePaymentSignature(order_id: string, payment_id: string):String {
   try {
     const razorpay_secret = process.env.TEST_API_SECRET!;
    if (!razorpay_secret) {
      this.logger.error('env var is failed to load');
      throw new ApiError(500, 'internal server error');
    }

    const hmac = crypto.createHmac('sha256', razorpay_secret);
    hmac.update(order_id + '|' + payment_id);
    const generatedSignature = hmac.digest('hex');

    return generatedSignature;
   } catch (error) {
    this.logger.error(`failed to generate Payment signature : ${error}`);
    throw new ApiError(500, 'internal server error')
   }
  };

  varifyPaymentSignature(order_id:string, payment_id:string, payment_signature:string):Boolean{
    try {
        const generatedSignature = this.generatePaymentSignature(order_id, payment_id);
        
        return generatedSignature === payment_signature;
    } catch (error) {
        this.logger.error(`failed to verify razorpay payment signature`);
        throw new ApiError(500, 'internal server error');
    };
  };

  async saveTransactionInDb(options:createTransactionTypes):Promise<Transaction>{
    try {
        return await this.prismaClient.transaction.create({
            data:{
                user_id:options.user_id,
                subscription_id:options.subscription_id,
                razorpay_order_id:options.razorpay_order_id,
                razorpay_payment_id:options.razorpay_payment_id,
                razorpay_signature:options.razorpay_signature,
                status:options.status,
                type:options.type,
                description:options.description,
                amount:options.amount,
                currency:options.currency,
                failure_reason:options.failure_reason
            }
        })
    } catch (error) {
        this.logger.error(`failed to create transaction : ${error}`);
        throw new ApiError(500, 'internal server error')
    }
  };
}
