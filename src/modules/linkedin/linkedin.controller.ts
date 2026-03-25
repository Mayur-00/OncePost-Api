import { RequestHandler, Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { LinkedInCallbackSchema } from './linkedin.dto.js';
import { Logger } from 'winston';
import { linkedinServices } from './linkedin.services.js';
import { ApiError } from '../../utils/apiError.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import crypto from 'crypto';

export class LinkedinController {
  constructor(
    private linkedinService: linkedinServices,
    private logger: Logger,
  ) {}

  startAuth: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      this.logger.error('unAuthorized Request');
      throw new ApiError(401, 'UnAuthorized');
    }

    const state = crypto.randomBytes(32).toString('hex');

    await this.linkedinService.createOAuthSession(req.user.id, state);
    const url = this.linkedinService.generateAuthUrl(state);

    res.status(200).json(new ApiResponse(200, url, 'Session Started'));
  });

  handleLinkedinAuthCallback: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error, error_description } = LinkedInCallbackSchema.parse(req.query);

    this.logger.info('code', { code: code });
    if (error) {
      return res.redirect(
        `${process.env.FRONTEND_URI}/error?error=${error_description || 'Authentication_Failed'}`,
      );
    }

    const session = await this.linkedinService.getOAuthSession(state);
    const userid = session.ownerid;

    const accessTokenServiceResponse = await this.linkedinService.getAccessToken(code);

    const access_token = accessTokenServiceResponse.access_token;

    const userInfoResponse = await this.linkedinService.getUserInfo(access_token);

    await this.linkedinService.createUsersLinkedinConnectionDatabaseRecord(
      userInfoResponse,
      accessTokenServiceResponse,
      userid,
    );
    await this.linkedinService.markSessionAsUsed(session.id);

    this.logger.info('user linkedin connection success', {
      email: userInfoResponse.email,
    });
    res.status(200).redirect(`${process.env.FRONTEND_URI}/dashboard`);
  });
}
