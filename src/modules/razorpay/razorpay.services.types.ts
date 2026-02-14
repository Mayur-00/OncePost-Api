import { TransactionStatus, TransactionType } from "../../generated/prisma/enums.js";

export interface createTransactionTypes {
    user_id:string;
    subscription_id:string;
    razorpay_payment_id:string
    razorpay_order_id :string;
    razorpay_signature?:string
    amount:number // Amount in INR
    currency:string
    status: TransactionStatus;
    type : TransactionType
    description :string
    failure_reason?:string
}
