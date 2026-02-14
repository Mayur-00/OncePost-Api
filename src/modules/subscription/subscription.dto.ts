import {z} from 'zod';

export const initateOrderSchema = z.object({
    plan_id:z.string().min(5)
});

export const verifyPaymentSchema = z.object({
    order_id:z.string().min(5),
    payment_id:z.string().min(5),
    payment_signature:z.string().min(5),
    plan_id:z.string().min(5)

});

