import { Logger } from 'winston';
import { PrismaClient } from '../../generated/prisma/client.js';
import Razorpay from 'razorpay';
import { ApiError } from '../../utils/apiError.js';
import { Orders } from 'razorpay/dist/types/orders.js';
import crypto from 'crypto';

export class RazorpayService {
  constructor(
    private prismaClient: PrismaClient,
    private logger: Logger,
    private razorpay: Razorpay,
  ) {}

  async createOrder(
    amount: number,
    currency: string,
    subscription_id: string,
    user_id: string,
    reciept?: string,
  ): Promise<{ order: Orders.RazorpayOrder; transaction_id: string }> {
    try {
      const options = {
        amount: amount * 100, // convert it into paise
        currency,
        reciept,
      };
      const rxp = await this.razorpay.orders.create(options);

      const transaction = await this.prismaClient.transaction.create({
        data: {
          user_id: user_id,
          amount: amount * 100,
          currency: currency,
          razorpay_order_id: rxp.id,
          subscription_id: subscription_id,
          type: 'SUBSCRIPTION_UPGRADE',
          status: 'PENDING',
        },
      });
      this.logger.info('razorpay order created');
      return { order: rxp, transaction_id: transaction.id };
    } catch (error) {
      this.logger.error(`failed to create razorpay order : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  generatePaymentSignature(order_id: string, payment_id: string): String {
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
      throw new ApiError(500, 'internal server error');
    }
  }

  async varifyPaymentSignatureAndFlagTransactionCompleated(
    order_id: string,
    payment_id: string,
    payment_signature: string,
    transaction_id: string,
  ): Promise<Boolean> {
    try {
      const generatedSignature = this.generatePaymentSignature(order_id, payment_id);

      if (generatedSignature === payment_signature) {
        await this.prismaClient.transaction.update({
          where: {
            id: transaction_id,
            status: 'PENDING',
          },
          data: {
            razorpay_order_id: order_id,
            razorpay_payment_id: payment_id,
            razorpay_signature: payment_signature,
            status: 'COMPLETED',
          },
        });

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`failed to verify razorpay payment signature`);
      throw new ApiError(500, 'internal server error');
    }
  }

  async getTransactionById(transaction_id: string) {
    try {
      return await this.prismaClient.transaction.findUnique({
        where: {
          id: transaction_id,
        },
      });
    } catch (error) {
      this.logger.error(`failed to get transaction details`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async getTransactionByOrderId(order_id: string) {
    try {
      return await this.prismaClient.transaction.findUnique({
        where: {
          razorpay_order_id: order_id,
        },
      });
    } catch (error) {
      this.logger.error(`failed to get transaction details`);
      throw new ApiError(500, 'internal server error');
    }
  }

  verifyWebhookSignature(rawBody: Buffer, razorpaySignature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  };

  async isWebookAlreadyProcessed(order_id:string) {
    try {
      return await this.prismaClient.transaction.findUnique({
        where:{
          razorpay_order_id:order_id,
          status:'COMPLETED',
        }
      })
    } catch (error) {
      this.logger.error(`failed to get transaction `);
      throw new ApiError(500, 'internal server error');
    }
  }
}
