import { Logger } from 'winston';
import { linkedinServices } from '../../../modules/linkedin/linkedin.services.js';
import { PostJobData } from '../../worker.types.js';
import { BlueskyService } from '../../../modules/bluesky/bluesky.services.js';

export class blueskyHandler {
  constructor(
    private blueskyServices: BlueskyService,
    private logger: Logger,
  ) {}

  async handle(jobData: PostJobData): Promise<unknown> {
    const { postId, userId, content, mediaUrl ,mediaType} = jobData;

    try {
      // Get account
      const isAlreadyPosted = await this.blueskyServices.isAlreadyPosted(postId);
      if (isAlreadyPosted) {
        this.logger.info('post is already posted on Bluesky');
        return;
      }

      const account = await this.blueskyServices.getUserAccount(userId);

      if (!account) {
        throw new Error('No active Bluesky account found');
      }
      const postDbRecord = await this.blueskyServices.createEmptyBlueskyPostDbRecord(
        userId,
        postId,
        account.id,
      );

      if (!postDbRecord) {
        throw new Error('Failed to create db record');
      }


      let response :{uri:string, cid:string};

      if (mediaUrl) {
        const imagebuffer = await this.blueskyServices.getImageBufferFromCloudinary(mediaUrl);

        const imageObj = {
            buffer:imagebuffer,
            mimeType:mediaType
        }

         response = await this.blueskyServices.publishPost(
            userId,
            content,
            imageObj
        );

      } else {
        // Text-only post
        response = await this.blueskyServices.publishPost(
            userId,
            content,
        );
      }

      // Save to DB
      const platformPost = await this.blueskyServices.flagPostSuccess(
      postDbRecord.id,
      response.cid,
      response.uri
      );

      this.logger.info(`post successfully published to Bluesky ${postId}`);
      return { success: true, platformPostId: platformPost.id };
    } catch (error) {
      this.logger.error(`post publishing failed with error: ${error}`);
      throw error;
    }
  }
}
