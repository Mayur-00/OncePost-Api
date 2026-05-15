import { Logger } from 'winston';
import { PrismaClient, User } from '../../generated/prisma/client.js';
import { OAuth2Client } from 'google-auth-library';
import { ApiError } from '../../utils/apiError.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { myJwtPayload } from '../../middlewares/auth.middleware.js';

export class UserServices {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
    private googleClient: OAuth2Client,
    private googleClientId: string,
  ) {}

  async verifyGoogleIdTokn(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.googleClientId,
      });

      const payload = ticket.getPayload();
      this.logger.info('Google ID Token verified successfully', { email: payload?.email });
      return payload;
    } catch (error) {
      this.logger.error('id token verification failed', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async getUserById(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      this.logger.info('User fetched by ID', { userId: id, found: !!user });
      return user;
    } catch (error) {
      this.logger.error('an error occored while fetching user', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async getUserByIdWithConnectedAccounts(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
        include: {
          connected_accounts: {
            select: {
              id: true,
              platform: true,
              display_name: true,
              profile_picture: true,
              username: true,
              isActive: true,
              isExpired: true,
            },
          },
          subscriptions: {
            where: {
              status: 'ACTIVE',
            },
            select: {
              end_date: true,
              start_date: true,
              post_creation_remaining: true,
              status: true,
              plan: {
                select: {
                  plan_tier: true,
                  maxPostsPerMonth: true,
                  price: true,
                },
              },
            },
          },
          _count: {
            select: {
              posts: true,
              platform_post: true,
              connected_accounts: true,
            },
          },
          
        },
      });
      this.logger.info('User fetched with connected accounts', {
        userId: id,
        connectedAccounts: user?._count.connected_accounts,
      });
      return user;
    } catch (error) {
      this.logger.error('an error occored while fetching user', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async getUserByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: email,
        },
      });
      this.logger.info('User fetched by email', { email: email, found: !!user });
      return user;
    } catch (error) {
      this.logger.error(`an error occored while fetching user, Error : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async createUser(
    name: string,
    email: string,
    provider: string,
    password?: string,
    providerid?: string,
    profilePic?: string,
    refreshToken?: string,
  ): Promise<User> {
    try {
      let hashedPassword;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 12);
      }

      const user = await this.prisma.user.create({
        data: {
          name: name,
          email: email,
          provider: provider === 'GOOGLE' ? 'GOOGLE' : 'CREDENTIAL',
          password: hashedPassword,
          provider_id: providerid,
          profile_picture: profilePic,
          refresh_token: refreshToken,
        },
      });
      this.logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
        provider: provider,
      });
      return user;
    } catch (error) {
      this.logger.error('an error occured during user creation', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async updateUser(
    email: string,
    provider: string,
    providerid?: string,
    refreshToken?: string,
  ) {
    try {
      const user = await this.prisma.user.update({
        where: {
          email: email,
        },

        data: {
          provider: provider === 'GOOGLE' ? 'GOOGLE' : 'CREDENTIAL',
          provider_id: providerid,
          refresh_token: refreshToken,
        },

        select:{
          email:true,
          name:true,
          profile_picture:true,
          updatedAt:true,
          isOnboarded:true,

          

        }
      });
      this.logger.info('User updated successfully', {
        email: user.email,
        provider: provider,
      });

      return user;
    } catch (error) {
      this.logger.error('an error occured during user creation', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async updateUsersRefreshToken(userid: string, refreshToken: string): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: userid,
        },
        data: {
          refresh_token: refreshToken,
        },
      });
      this.logger.info('User refresh token updated', { userId: userid });
      return user;
    } catch (error) {
      this.logger.error('an error occured while updating user', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async clearUsersRefreshToken(userid: string) {
    try {
      const updated = await this.prisma.user.update({
        where: {
          id: userid,
        },
        data: {
          refresh_token: '',
        },
      });
      this.logger.info('User refresh token cleared', { userId: userid });
      return updated;
    } catch (error) {
      this.logger.error('an error occured while clearing token', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = (await jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!,
      )) as myJwtPayload;
      this.logger.info('Refresh token verified successfully', { userId: payload.sub });
      return payload;
    } catch (error) {
      this.logger.error("token didn't verify", { error: error });
      throw new ApiError(401, 'token expired or invalid', "INCORRECT_PASSWORD" ,[]  );
    }
  }
  async verifyPassword(new_password: string, user_password: string): Promise<boolean> {
    try {
      const isMatched = await bcrypt.compare(new_password, user_password);
      this.logger.info('Password verification completed', { isMatched: isMatched });
      return isMatched;
    } catch (error) {
      this.logger.error("failed to verify password", { error: error });
      throw new ApiError(400, 'Incorrect Password');
    }
  }
  async DeleteAccount(userId: string) {
    try {
      const deleted = await this.prisma.user.delete({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          profile_picture: true,
          isOnboarded: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      this.logger.info('User account deleted', { userId: userId, email: deleted.email });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete user account', { userId: userId, error: error });
      throw error;
    }
  }
  async updateUserWithImage(userid: string, imageUrl: string) {
    try {
      const updated = await this.prisma.user.update({
        where: {
          id: userid,
        },
        data: {
          profile_picture: imageUrl,
        },
      });
      this.logger.info('User profile picture updated', { userId: userid });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update user profile picture', { userId: userid, error: error });
      throw error;
    }
  }
  async updateUsersName(userid: string, name: string) {
    try {
      const updated = await this.prisma.user.update({
        where: {
          id: userid,
        },
        data: {
          name: name,
        },
      });
      this.logger.info('User name updated', { userId: userid, newName: name });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update user name', { userId: userid, error: error });
      throw error;
    }
  }
  async activateFreePlan(user_id: string) {
    try {
      const plan = await this.prisma.subscriptionPlan.findFirst({
        where: {
          plan_tier: 'FREE',
        },
      });

      if (!plan) {
        this.logger.error(`Free plan not found`);
        throw new ApiError(404, 'Plan not found');
      };

      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 10);

      const subscriptions = await this.prisma.subscription.create({
        data: {
          user_id: user_id,
          plan_id: plan.id,
          post_creation_remaining: plan.maxPostsPerMonth,
          start_date: new Date(),
          end_date: farFutureDate,
          status: 'ACTIVE',
        },
      });
      this.logger.info('Free plan activated for user', {
        userId: user_id,
        subscriptionId: subscriptions.id,
      });
      return subscriptions;
    } catch (error) {
      this.logger.error(`couldn't activate free plan, ${error}`);

      throw new ApiError(500, 'Internal Service Error');
    }
  }

  async setOnboardedTrue(user_id: string) {
    try {
      const updated = await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          isOnboarded: true,
        },
      });
      this.logger.info('User onboarding completed', { userId: user_id });
      return updated;
    } catch (error) {
      this.logger.error(`unable to set Onboarded True, error : ${error}`);
      throw new ApiError(500, 'Internl Server Error');
    }
  }
}
