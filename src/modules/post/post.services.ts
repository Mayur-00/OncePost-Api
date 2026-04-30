import { Logger } from 'winston';
import { Post, PostStatus, PrismaClient, SocialPlatforms } from '../../generated/prisma/client.js';
import { ApiError } from '../../utils/apiError.js';
import { QUERY_TYPE } from './post.types.js';

export class PostService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
  ) {}

  async createPost(
    content: string,
    media_url: string,
    user_id: string,
    mimeType: string,
    status: PostStatus,
    scheduled_for?: SocialPlatforms[],
    scheduledAt?: Date,
  ) {
    try {
      const post = await this.prisma.post.create({
        data: {
          content: content || '',
          mediaUrl: media_url || '',
          owner_id: user_id,
          status: status,
          mediaType: mimeType,
          scheduled_for: scheduled_for || [],
          scheduledAt: scheduledAt,
        },
      });
      this.logger.info('Post Created', { postid: post.id });

      return post;
    } catch (error) {
      this.logger.error("Couldn't Create Post ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }
  async updatePost(new_content: string, new_media_url: string, user_id: string) {
    try {
      return await this.prisma.post.update({
        where: {
          id: user_id,
        },
        data: {
          content: new_content,
          mediaUrl: new_media_url,
          status: 'UPLOADED',
        },
      });
    } catch (error) {
      this.logger.error("Couldn't Update The Post ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }
  async deletePost(user_id: string, post_id: string) {
    try {
      const post = await this.prisma.post.delete({
        where: {
          id: post_id,
          owner_id: user_id,
        },
      });

      this.logger.info('Post Deleted Success', { return_value: post });

      return true;
    } catch (error) {
      this.logger.error("Couldn't Delete The Post ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }
  async getPostById(post_id: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: {
          id: post_id,
        },
        include: {
          platform_post: {
            select: {
              id: true,
              platform_post_url: true,
              platform: true,
              status: true,
              postedAt: true,
            },
          },
        },
      });
      this.logger.info('Post Fetched Successfully ');
      return post;
    } catch (error) {
      this.logger.error("Couldn't get The Post ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }
  async getAllPosts(user_id: string, limit: number, skip: number) {
    try {
      const posts = await this.prisma.post.findMany({
        where: {
          owner_id: user_id,
        },

        include: {
          platform_post: {
            select: {
              platform: true,
              id: true,
              platform_post_url: true,
              status: true,
            },
          },
        },
        take: limit,
        skip: skip,
        orderBy: {
          id: 'desc',
        },
      });
      this.logger.info('All posts retrieved successfully', {
        userId: user_id,
        count: posts.length,
        limit: limit,
        skip: skip,
      });
      return posts;
    } catch (error) {
      this.logger.error("Couldn't get The Posts ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  };


 /**
  * 
  * @param user_id 
  * @returns Scheduled Posts Array
  */

  async getAllScheduledPosts(user_id: string) {
    try {
      return await this.prisma.post.findMany({
        where: {
          owner_id: user_id,
          status: 'SCHEDULED',
        },
        select:{
          id:true,
          content:true,
          mediaUrl:true,
          scheduledAt:true,

        }
      });
    } catch (error) {
      this.logger.error("Couldn't get The Posts ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }
  async getPostsByQuery(
    user_id: string,
    query: string,
    limit: number,
    skip: number,
    type: QUERY_TYPE,
  ) {
    try {
      if (type === 'ALL') {
        const posts = await this.prisma.post.findMany({
          where: {
            owner_id: user_id,
            content: { contains: query },
          },

          include: {
            platform_post: {
              select: {
                platform: true,
                id: true,
                platform_post_url: true,
                status: true,
              },
            },
          },
          take: limit,
          skip: skip,
          orderBy: {
            id: 'desc',
          },
        });
        this.logger.info('Posts retrieved by search query', {
          userId: user_id,
          query: query,
          count: posts.length,
          type: type,
        });
        return posts;
      } else {
        const posts = await this.prisma.post.findMany({
          where: {
            owner_id: user_id,
            content: query,
            status: type as unknown as PostStatus,
          },

          include: {
            platform_post: {
              select: {
                platform: true,
                id: true,
                platform_post_url: true,
                status: true,
              },
            },
          },
          take: limit,
          skip: skip,
          orderBy: {
            id: 'desc',
          },
        });
        this.logger.info('Posts retrieved by status filter', {
          userId: user_id,
          status: type,
          count: posts.length,
        });
        return posts;
      }
    } catch (error) {
      this.logger.error("Couldn't get The Posts ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }
  async updatePostPublished(postid: string) {
    try {
      const updated = await this.prisma.post.update({
        where: {
          id: postid,
        },
        data: {
          status: 'UPLOADED',
        },
      });
      this.logger.info('Post marked as published', { postId: postid });
      return updated;
    } catch (error) {
      this.logger.error(`post updation failed with error ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async isServiceAvailable(user_id: string) {
    try {
      const userSubscription = await this.prisma.subscription.findFirst({
        where: {
          user_id: user_id,
          status: 'ACTIVE',
        },
      });

      if (!userSubscription) {
        this.logger.error('no user subscription found');
        throw new ApiError(404, 'No Active User Subscription', [], 'NO_SUBSCRIPTION');
      }

      if (userSubscription.end_date <= new Date()) {
        this.logger.error(`subscription expired, id:  ${userSubscription.id}`);
        await this.prisma.subscription.update({
          where: {
            id: userSubscription.id,
          },
          data: {
            status: 'EXPIRED',
          },
        });
        throw new ApiError(403, 'Subscription Expired');
      }

      if (userSubscription.post_creation_remaining <= 0) {
        this.logger.warn('User has no remaining posts in subscription', {
          userId: user_id,
          subscriptionId: userSubscription.id,
        });
        return false;
      }
      this.logger.info('Service available for user', {
        userId: user_id,
        remainingPosts: userSubscription.post_creation_remaining,
      });
      return true;
    } catch (error) {
      this.logger.error(`failed to check post service available, error: ${error}`);
      throw new ApiError(500, 'Internal Server Error');
    }
  }
  async LogUsage(user_id: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          user_id: user_id,
          status: 'ACTIVE',
        },
      });

      if (!subscription) {
        this.logger.error(`subscription not found with user id : ${user_id}`);
        throw new ApiError(404, 'subscription not found');
      }

      const updatedSubscription = await this.prisma.subscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          post_creation_remaining: subscription.post_creation_remaining - 1,
        },
      });

      this.logger.info('Usage logged successfully', {
        userId: user_id,
        remainingPosts: updatedSubscription.post_creation_remaining,
      });
      return updatedSubscription;
    } catch (error) {
      // Re-throw ApiError without wrapping
      if (error instanceof ApiError) {
        throw error;
      }

      this.logger.error(`couldn't log usage, error: ${error}`);
      throw new ApiError(500, 'Internal Server Error');
    }
  }
}
