import { Logger } from 'winston';
import { PrismaClient, Subscription, SubscriptionPlan } from '../../generated/prisma/client.js';
import { createSubscription } from './subscription.types.js';
import { ApiError } from '../../utils/apiError.js';
export class SubscriptionService {
    constructor(private prismaClient:PrismaClient, private logger:Logger){};


    async createSubscription (user_id:string, plan_id:string, ){
        try {

            const start = new Date()
            const end = new Date(start.setMonth(start.getMonth() +1));

            return await this.prismaClient.subscription.create({
                data:{
                    user_id:user_id,
                    plan_tier_id:plan_id,
                    status:'ACTIVE',
                    current_period_start:start,
                    current_period_end:end
                }
            })
        } catch (error) {
            this.logger.error(`failed to create subscription : ${error}`);
            throw new ApiError(500, 'internal server error');
        }
    }
    async getSubscription (user_id:string){
        try {
            return await this.prismaClient.subscription.findFirst({
                where:{
                    user_id:user_id,
                    status:'ACTIVE'
                },
                include:{
                    plan:true
                }
            })
        } catch (error) {
            this.logger.error(`failed to get Current subscription : ${error}`);
            throw new ApiError(500, 'intenal server error');
        }
    };
    async cancelSubscription(id:string){
        try {
            return await this.prismaClient.subscription.update({
                where:{
                    id:id
                },
                data:{
                    status:'CANCELLED'
                }
            })
        } catch (error) {
            
        }
    };
    async getAllSubscriptionPlans() {
        try {
            return await this.prismaClient.subscriptionPlan.findMany();

        } catch (error) {
            this.logger.error(`failed to get subscription plans : ${error}`);
            throw new ApiError(500, 'internal server error')
        }
    };
    async getSubscriptionPlanById(plan_id:string) {
        try {
            return await this.prismaClient.subscriptionPlan.findUnique({
                where:{
                    id:plan_id
                }
            });

        } catch (error) {
            this.logger.error(`failed to get subscription plan : ${error}`);
            throw new ApiError(500, 'internal server error')
        }
    };

}