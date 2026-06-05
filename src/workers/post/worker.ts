import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.config.js';
import { jobBody, PostJobData } from '../worker.types.js';
import logger from '../../config/logger.config.js';
import { postServices } from '../../modules/post/index.js';
import { LinkedinService } from '../../modules/linkedin/index.js';
import { xServices } from '../../modules/x/index.js';
import { linkedinHandler } from './handlers/linkedin.handler.js';
import { Xhandler } from './handlers/x.handler.js';
import { blueskyHandler } from './handlers/Bluesky.handler.js';
import { BlueskyServices } from '../../modules/bluesky/index.js';

export const postWorker = new Worker<jobBody>(
  'post',
  async (job) => {
    try {
      const { postId, userid, platfroms } = job.data;

      if (!postId) {
        logger.error(`post id or userid not found`);
        throw new Error('postid not found');
      }

      const post = await postServices.getPostById(postId);

      if (!post) {
        logger.error('Post Not Found');
        throw new Error('Post Not Found');
      }

      for (const platform of platfroms) {
        switch (platform) {
          case 'LINKEDIN': {
            const lnkHandler = new linkedinHandler(LinkedinService, logger);
            const linkedinJobData: PostJobData = {
              postId,
              content: post.content || '',
              mediaType: post.mediaType || '',
              mediaUrl: post.mediaUrl || '',
              userId: userid,
            };
            await lnkHandler.handle(linkedinJobData);

            logger.info(`linkedin post published Successfully`);
            break;
          }

          case 'X': {
            const xhandler = new Xhandler(xServices, logger);
            const xjobData: PostJobData = {
              postId,
              content: post.content || '',
              mediaType: post.mediaType || '',
              mediaUrl: post.mediaUrl || '',
              userId: userid,
            };

            await xhandler.handle(xjobData);

            logger.info('tweet published on x successfully');
            break;
          }
          case 'BLUESKY': {
            const blsHander = new blueskyHandler(BlueskyServices, logger);
            const blsJobData: PostJobData = {
              postId,
              content: post.content || '',
              mediaType: post.mediaType || '',
              mediaUrl: post.mediaUrl || '',
              userId: userid,
            };

            await blsHander.handle(blsJobData);

            logger.info('post published on Bluesky successfully');
            break;
          }
          default:
            throw new Error('Unsupported platform');
        }
      }

      await postServices.updatePostPublished(postId);

      return true;
    } catch (error) {
      logger.error(`Post Worker Error: ${error}`);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 1 },
);

// Worker event listeners
postWorker.on('completed', (job) => {
  logger.info(`✅ publish post job ${job.id} completed successfully`);
});

postWorker.on('failed', (job, err) => {
  logger.error(`❌ publish post job ${job?.id} failed:`, err);
});

postWorker.on('error', (err) => {
  logger.error('publish Worker process error:', err);
});

// Keep worker alive when run as standalone process
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info('🚀 publish Post Worker started on separate process');
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing Post worker...');
    await postWorker.close();
    process.exit(0);
  });
}
