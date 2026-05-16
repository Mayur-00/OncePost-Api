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
        amount: amount,
        currency,
        reciept,
      };
      const rxp = await this.razorpay.orders.create(options);
      console.log(amount);

      const transaction = await this.prismaClient.transaction.create({
        data: {
          user_id: user_id,
          amount: amount,
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

  generatePaymentSignature(order_id: string, payment_id: string): string {
    try {
      const razorpay_secret = process.env.RAZORPAY_KEY_SECRET!;
      if (!razorpay_secret) {
        this.logger.error('env var is failed to load');
        throw new ApiError(500, 'internal server error');
      }

      const hmac = crypto.createHmac('sha256', razorpay_secret);
      hmac.update(order_id + '|' + payment_id);
      const generatedSignature = hmac.digest('hex');
      this.logger.info('Payment signature generated successfully', { orderId: order_id });
      return generatedSignature;
    } catch (error) {
      this.logger.error(`failed to generate Payment signature : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  async varifyPaymentSignature(
    order_id: string,
    payment_id: string,
    payment_signature: string,
    transaction_id: string,
  ): Promise<boolean> {
    try {
      const generatedSignature = this.generatePaymentSignature(order_id, payment_id);

      if (generatedSignature === payment_signature) {
        this.logger.info('verification success')
        this.logger.info('Payment signature verified and transaction completed', {
          transactionId: transaction_id,
          orderId: order_id,
        });
        return true;
      }
      this.logger.warn('Payment signature verification failed', { orderId: order_id });
      return false;
    } catch (error) {
      this.logger.error(`failed to verify razorpay payment signature : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  async getTransactionById(transaction_id: string) {
    try {
      const transaction = await this.prismaClient.transaction.findUnique({
        where: {
          id: transaction_id,
        },
      });
      this.logger.info('Transaction retrieved by ID', {
        transactionId: transaction_id,
        found: !!transaction,
      });
      return transaction;
    } catch (error) {
      this.logger.error(`failed to get transaction details : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async getTransactionByOrderId(order_id: string) {
    try {
      const transaction = await this.prismaClient.transaction.findUnique({
        where: {
          razorpay_order_id: order_id,
        },
      });
      this.logger.info('Transaction retrieved by order ID', {
        orderId: order_id,
        found: !!transaction,
      });
      return transaction;
    } catch (error) {
      this.logger.error(`failed to get transaction details : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  verifyWebhookSignature(rawBody: Buffer, razorpaySignature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');
    const isValid = expectedSignature === razorpaySignature;
    if (isValid) {
      this.logger.info('Webhook signature verified successfully');
    } else {
      this.logger.warn('Webhook signature verification failed');
    }
    return isValid;
  }

  async isWebookAlreadyProcessed(order_id: string) {
    try {
      const transaction = await this.prismaClient.transaction.findUnique({
        where: {
          razorpay_order_id: order_id,
          status: 'COMPLETED',
        },
      });
      this.logger.info('Webhook processed status checked', {
        orderId: order_id,
        isProcessed: !!transaction,
      });
      return transaction;
    } catch (error) {
      this.logger.error(`failed to get transaction : ${error} `);
      throw new ApiError(500, 'internal server error');
    }
  }
}
