import { Logger } from 'winston';
import { PrismaClient } from '../../generated/prisma/client.js';

export class AnalyticsService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
  ) {}

  async getPastSixMonthsMetrics(userId: string) {
    // 1️⃣ Calculate a moving window boundary (start of the month, 5 months ago)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // 2️⃣ Query your platform_post table based on your schema fields
    const platformPosts = await this.prisma.platformPost.findMany({
      where: {
        owner_id: userId,
        status: 'POSTED', // Matches your PlatfromPostStatus enum
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        platform: true, // Matches your SocialPlatforms enum (LINKEDIN, X)
        createdAt: true,
      },
    });

    // 3️⃣ Define month name strings for formatting
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // 4️⃣ Pre-populate your chart dictionary in chronological order
    const dataMap: Record<string, { month: string; linkedin: number; x: number }> = {};

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - i);
      const mName = monthNames[targetDate.getMonth()];

      dataMap[mName] = { month: mName, linkedin: 0, x: 0 };
    }

    // 5️⃣ Populate the mapping with records matching your SocialPlatforms definitions
    platformPosts.forEach((pPost) => {
      const monthName = monthNames[pPost.createdAt.getMonth()];

      // Ensure the record falls within our active sliding viewport
      if (dataMap[monthName]) {
        if (pPost.platform === 'LINKEDIN') {
          dataMap[monthName].linkedin += 1;
        } else if (pPost.platform === 'X') {
          dataMap[monthName].x += 1;
        }
      }
    });

    // Flatten your dictionary into a list of monthly values for Recharts
    return Object.values(dataMap);
  }

  async getMonthlyConsistencyMetrics(userId: string) {
    // 1️⃣ Calculate a 30-day lookback window boundary
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // 2️⃣ Fetch raw successful postings matching your enums
    const platformPosts = await this.prisma.post.findMany({
      where: {
        owner_id: userId,
        status: 'UPLOADED', // PlatfromPostStatus enum
        updatedAt: { gte: thirtyDaysAgo },
      },
      select: {
        updatedAt: true,
      },
    });

    // 3️⃣ Pre-populate every calendar date key to avoid gaps
    const dataMap: Record<string, { date: string; posts: number }> = {};

    for (let i = 29; i >= 0; i--) {
      const loopDate = new Date();
      loopDate.setDate(loopDate.getDate() - i);
      const dateKey = loopDate.toISOString().split('T')[0]; // YYYY-MM-DD

      dataMap[dateKey] = { date: dateKey, posts: 0 };
    }

    // 4️⃣ Aggregate total platform actions into their calendar date slots
    platformPosts.forEach((pPost) => {
      const dateKey = pPost.updatedAt.toISOString().split('T')[0];

      if (dataMap[dateKey]) {
        dataMap[dateKey].posts += 1;
      }
    });

    return Object.values(dataMap);
  }
}
