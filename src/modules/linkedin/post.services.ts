import { PrismaClient } from '../../generated/prisma/client.js';
import { Logger } from 'winston';
import { ApiError } from '../../utils/apiError.js';

export class PostServices {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
  ) {}

  async createPost(userid: string, mediaUrl?: string, text?: string) {
    try {
      const post = await this.prisma.post.create({
        data: {
          owner_id: userid,
          content: text || '',
          mediaUrl: mediaUrl || '',
          status: 'UPLOADED',
        },
      });

      this.logger.info('Post created successfully (LinkedIn)', { userId: userid, postId: post.id, hasMedia: !!mediaUrl });
      return post;
    } catch (error) {
      this.logger.error('an occured while creating post ', { error: error });
      throw new ApiError(500, 'post creation failed');
    }
  }
}
