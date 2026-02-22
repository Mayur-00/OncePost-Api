import { RazorpayService } from "./razorpay.services.js";
import prisma from '../../config/prisma.js';
import logger from '../../config/logger.config.js';
import { RazorpayInstance } from "../../config/razorpay.config.js";

export const RazorpayServices = new RazorpayService(prisma, logger, RazorpayInstance);


export * from './razorpay.dto.js';
export * from './razorpay.types.js'