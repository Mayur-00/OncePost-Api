import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Logger } from 'winston';
import { AnalyticsService } from './analytics.services.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private logger: Logger,
  ) {}

  getPlatformMetrics: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    // Pull user ID appended from your auth middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    this.logger.info(`Fetching platform metrics for user ID: ${userId}`);
    const chartData = await this.analyticsService.getPastSixMonthsMetrics(userId);

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  });
  getPostConsistancyMatrics: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    // Pull user ID appended from your auth middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    this.logger.info(`Fetching platform metrics for user ID: ${userId}`);
    const data = await this.analyticsService.getMonthlyConsistencyMetrics(userId);

    return res.status(200).json({
      success: true,
      data: data,
    });
  });
}
