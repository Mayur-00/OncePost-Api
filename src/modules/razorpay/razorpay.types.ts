export interface RazorpayWebhookEvent {
  entity: 'event';
  account_id: string;
  event: 'payment.captured' | 'payment.failed' | 'payment.refunded';
  contains: string[];
  payload: {
    payment: {
      entity: RazorpayPaymentEntity;
    };
  };
  created_at: number;
}

export interface RazorpayPaymentEntity {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: string;
  order_id: string | null;
  invoice_id?: string | null;
  international?: boolean;
  method?: string;
  amount_refunded?: number;
  refund_status?: string | null;
  captured?: boolean;
  description?: string | null;
  email?: string | null;
  contact?: string | null;
  notes?: Record<string, string>;
  fee?: number | null;
  tax?: number | null;
  error_code?: string | null;
  error_description?: string | null;
  created_at: number;
}
