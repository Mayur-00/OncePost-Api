// razorpay-webhook.schema.ts

import { z } from 'zod';

export const RazorpayPaymentEntitySchema = z.object({
  id: z.string(),
  entity: z.literal('payment'),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  order_id: z.string().nullable(),
  invoice_id: z.string().nullable().optional(),
  international: z.boolean().optional(),
  method: z.string().optional(),
  amount_refunded: z.number().optional(),
  refund_status: z.string().nullable().optional(),
  captured: z.boolean().optional(),
  description: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  notes: z.record(z.string(), z.string()).optional(),
  fee: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  error_code: z.string().nullable().optional(),
  error_description: z.string().nullable().optional(),
  created_at: z.number(),
});

export const RazorpayWebhookSchema = z.object({
  entity: z.literal('event'),
  account_id: z.string(),
  event: z.enum(['payment.captured', 'payment.failed', 'payment.refunded']),
  contains: z.array(z.string()),
  payload: z.object({
    payment: z.object({
      entity: RazorpayPaymentEntitySchema,
    }),
  }),
  created_at: z.number(),
});
