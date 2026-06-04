import { BskyAgent } from '@atproto/api';
import { PrismaClient, SocialAccount, SocialPlatforms } from '../../generated/prisma/client.js';
import { ApiError } from '../../utils/apiError.js';
import { Logger } from 'winston';
import { Axios } from 'axios';

// Layout matching the schema's flat metadata structure for JSON storage
interface BlueskyPlatformData {
  did: string;
  handle: string;
}

export class BlueskyService {
  constructor(
    private prisma: PrismaClient,
    private httpClient: Axios,
    private logger: Logger,
  ) {}

  /**
   * 1. CONNECT / LINK ACCOUNT
   * Authenticates an App Password for the first time and saves/upserts it to the DB.
   */
  async connectAccount(
    userId: string,
    identifier: string,
    appPassword: string,
  ): Promise<{ success: boolean; handle: string }> {
    const agent = new BskyAgent({ service: 'https://bsky.social' });

    try {
      const loginResponse = await agent.login({
        identifier,
        password: appPassword,
      });

      if (!loginResponse.success) {
        throw new ApiError(400, 'Email or password is wrong');
      }

      const { did, handle, accessJwt, refreshJwt } = loginResponse.data;
      const platformDataPayload: BlueskyPlatformData = { did, handle };
      const tokenExpiryDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      const existingAccount = await this.prisma.socialAccount.findFirst({
        where: {
          owner_id: userId,
          platform: SocialPlatforms.BLUESKY,
        },
      });

      if (existingAccount) {
        await this.prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            platform_userid: did,
            username: handle,
            display_name: handle,
            access_token: accessJwt,
            refresh_token: refreshJwt,
            token_expiry: tokenExpiryDate,
            platformData: platformDataPayload as any,
            isExpired: false,
            isActive: true,
            lastSync: new Date(),
          },
        });
      } else {
        await this.prisma.socialAccount.create({
          data: {
            owner_id: userId,
            platform: SocialPlatforms.BLUESKY,
            platform_userid: did,
            username: handle,
            display_name: handle,
            access_token: accessJwt,
            refresh_token: refreshJwt,
            token_expiry: tokenExpiryDate,
            platformData: platformDataPayload as any,
            isExpired: false,
            isActive: true,
            lastSync: new Date(),
          },
        });
      }

      return { success: true, handle };
    } catch (error: any) {
      this.logger.error(`Failed linking Bluesky account: ${error}`);
      throw new ApiError(500, error?.message || 'Bluesky validation failed.');
    }
  }

  /**
   * 2. LIFECYCLE MANAGEMENT FACTORY AGENT
   * Evaluates token age, executes background token rotations with the PDS,
   * handles expirations, and provides a fully authenticated instance.
   */
  async getAuthenticatedAgent(userId: string): Promise<BskyAgent | null> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        owner_id: userId,
        platform: SocialPlatforms.BLUESKY,
      },
    });

    if (!account) {
      throw new ApiError(400, 'No Bluesky configuration connected for this user profile.');
    }

    const now = new Date();
    const lastUpdate = new Date(account.updatedAt);
    const msElapsed = now.getTime() - lastUpdate.getTime();

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    // CASE A: The connection is completely dead (> 30 days)
    if (msElapsed >= THIRTY_DAYS_MS || account.isExpired) {
      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          isExpired: true,
          isActive: false,
        },
      });
      this.logger.error(
        `Bluesky session for user ${userId} has expired permanently due to long-term inactivity.`,
      );
      throw new ApiError(400, 'Bluesky account is expired', 'BLUESKY_ACCOUNT_EXPIRED');
    }

    const agent = new BskyAgent({ service: 'https://bsky.social' });
    const platformMeta = account.platformData as unknown as BlueskyPlatformData;

    // CASE B: Token is aged past 2 hours but safe to refresh
    if (msElapsed >= TWO_HOURS_MS || now >= new Date(account.token_expiry)) {
      await agent.resumeSession({
        did: account.platform_userid,
        handle: account.username || platformMeta.handle,
        accessJwt: account.access_token,
        refreshJwt: account.refresh_token || '',
        active: true,
      });

      const refreshResponse = await agent.com.atproto.server.refreshSession();

      if (!refreshResponse.success) {
        throw new ApiError(
          400,
          'PDS refused to rotate session tokens. Re-authentication required.',
          'BLUESKY_ACCOUNT_EXPIRED',
        );
      }

      const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          access_token: refreshResponse.data.accessJwt,
          refresh_token: refreshResponse.data.refreshJwt,
          token_expiry: newExpiry,
          lastSync: new Date(),
        },
      });
    }
    // CASE C: Safe to reuse memory cache tokens (< 2 hours)
    else {
      await agent.resumeSession({
        did: account.platform_userid,
        handle: account.username || platformMeta.handle,
        accessJwt: account.access_token,
        refreshJwt: account.refresh_token || '',
        active: true,
      });
    }

    return agent;
  }

  /**
   * 3. SINGLE OPTIONAL IMAGE POSTING SERVICE
   * Obtains a valid agent, checks for an optional image object, uploads it if present,
   * configures the exact AT Protocol single embed payload, and submits the post.
   */
  async publishPost(
    userId: string,
    text: string,
    image?: { buffer: Buffer; mimeType: string },
  ): Promise<{ uri: string; cid: string }> {
    try {
      // Fetch a verified, auto-refreshed instance using our factory pattern logic above
      const agent = await this.getAuthenticatedAgent(userId);
      if (!agent) {
        this.logger.error('failed to get bluesky agent');
        throw new ApiError(
          400,
          'Unable to post. Your Bluesky authorization has expired. Please log back in.',
        );
      }

      // Base structural post record layout
      const postRecord: any = {
        $type: 'app.bsky.feed.post',
        text: text,
        createdAt: new Date().toISOString(),
      };

      // 1. Process the image asset only if it was supplied in the request parameters
      if (image) {
        // Safety validation check: Bluesky limits image blob uploads to 2MB (2,000,000 bytes)
        if (image.buffer.length > 2000000) {
          this.logger.error(`Image buffer size is too much, length: ${image.buffer.length}`);
          throw new ApiError(
            400,
            'Image file size too large. Bluesky enforces a maximum limit of 2MB per Image.',
          );
        }

        // Stream the raw asset bytes to the personal data server
        const uploadResponse = await agent.uploadBlob(image.buffer, {
          encoding: image.mimeType, // e.g. "image/jpeg", "image/png"
        });

        if (!uploadResponse.success) {
          this.logger.error('Failed to upload image buffer to blusky');
          throw new ApiError(500, 'Failed to upload media asset to the Bluesky repository server.');
        }

        // 2. Attach the single uploaded image blob to the main post payload structure
        postRecord.embed = {
          $type: 'app.bsky.embed.images',
          images: [
            {
              image: uploadResponse.data.blob,
              alt: text.substring(0, 10) || '', // Keeping string structure safe for content accessibility readers
            },
          ],
        };
      }

      // 3. Dispatch the post to the repository network timeline
      const postResponse = await agent.post(postRecord);

      this.logger.info(`Post Published to bluesky, uri ${postResponse.uri}`);

      return {
        uri: postResponse.uri,
        cid: postResponse.cid,
      };
    } catch (error) {
      this.logger.error(`Failed To Post To Bluesky, error ${error}`);
      throw new ApiError(500, 'Internal Server Error');
    }
  }
  async getImageBufferFromCloudinary(image_url: string) {
    try {
      const response = await this.httpClient.get(image_url, { responseType: 'arraybuffer' });
      this.logger.info(
        `Image buffer retrieved from Cloudinary (Bluesky) ${(image_url.length, response.data.length)}`,
      );
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.info('an error occured while getting image from cloudinary', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async getPostFromDb(postId: string, userId: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: {
          id: postId,
          owner_id: userId,
        },
      });
      this.logger.info('Post retrieved from database (Bluesky');
      return post;
    } catch (error) {
      this.logger.error('an error occured while getting the post', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async flagPostSuccess(postid: string, BlueskyPostDid: string, BlueskyPostUrl: string) {
    try {
      const updated = await this.prisma.platformPost.update({
        where: {
          id: postid,
        },
        data: {
          status: 'POSTED',
          platform_post_id: BlueskyPostDid,
          platform_post_url: BlueskyPostUrl,
        },
      });
      this.logger.info('Bluesky post flagged as successfully posted');
      return updated;
    } catch (error) {
      this.logger.error(`failed to update flag ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  async isAlreadyPosted(postid: string) {
    try {
      const posted = await this.prisma.platformPost.findFirst({
        where: {
          id: postid,
          platform: 'BLUESKY',
          status: 'POSTED',
        },
      });
      this.logger.info(`BlueSky post status checked isPosted : ${!!posted}`);
      return posted;
    } catch (error) {
      this.logger.error(`failed to check ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  async flagPostFailed(platform_Post_id: string, error: string) {
    try {
      const updated = await this.prisma.platformPost.update({
        where: {
          id: platform_Post_id,
        },
        data: {
          error: error,
          status: 'FAILED',
          failedAt: new Date(Date.now()),
        },
      });
      this.logger.info('Bleusky post failure flagged in database', {
        postId: platform_Post_id,
        error: error,
      });
      return updated;
    } catch (error) {
      this.logger.error(`failed to flag failed Post : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  async createEmptyBlueskyPostDbRecord(
    user_id: string,
    post_id: string,
    bluesky_account_id: string,
  ) {
    try {
      const record = await this.prisma.platformPost.create({
        data: {
          owner_id: user_id,
          post_id: post_id,
          account_id: bluesky_account_id,
          platform: 'BLUESKY',
          status: 'PENDING',
        },
      });
      this.logger.info(
        `Empty LinkedIn post database record created ${{
          userId: user_id,
          postId: post_id,
          accountId: bluesky_account_id,
        }}`,
      );
      return record;
    } catch (error) {
      this.logger.error(`failed to create sample Bluesky post : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  async getUserAccount(userid: string): Promise<SocialAccount> {
    try {
      const user = await this.prisma.socialAccount.findFirst({
        where: {
          owner_id: userid,
          platform: 'BLUESKY',
          isActive: true,
          isExpired: false,
        },
      });
      if (!user) {
        this.logger.error(`bluesky account not found ${{ userId: userid }}`);
        throw new ApiError(
          404,
          'account not found , please reconnect to bluesky ',
          'BLUESKY_ACCOUNT_EXPIRED',
        );
      }

      this.logger.info(`Bluesky account found , ${{ userId: userid, accountId: user.id }}`);
      return user;
    } catch (error) {
      this.logger.error('account fetch Failed : ', { error });
      throw new ApiError(404, 'database Bluesky account fetch failed', 'BLUESKY_ACCOUNT_EXPIRED');
    }
  }
}
