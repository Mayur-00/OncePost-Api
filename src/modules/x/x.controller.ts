import { Logger } from 'winston';
import { XServices } from './x.services.js';
import { RequestHandler, Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/apiError.js';

import { XCallbackSchema } from './x.dto.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import crypto from 'crypto';

export class XController {
  constructor(
    private logger: Logger,
    private XServices: XServices,
  ) {}

  getAuth: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { code_challenge, code_verifier } = this.XServices.generatePKCE();

    if (!req.user) {
      this.logger.error('req.user not found');
      throw new ApiError(400, 'UnAuthorized');
    }

    const state = crypto.randomBytes(32).toString('hex');
    await this.XServices.createOAuthSession(req.user.id, code_verifier, state);

    this.logger.info(`redirectUri while url creation ${process.env.X_REDIRECT_URI!}`);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.X_CLIENT_ID!,
      redirect_uri: process.env.X_REDIRECT_URI!,
      scope: 'tweet.read tweet.write users.read offline.access media.write',
      state: state,
      code_challenge: code_challenge,
      code_challenge_method: 'S256',
    });

    const url = `https://x.com/i/oauth2/authorize?${params.toString()}`;

    res.status(200).json(new ApiResponse(200, { url }, 'success'));
  });
  handleCallback: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error, error_description } = XCallbackSchema.parse(req.query);

    if (error) {
      this.logger.error('error occored in callback ', { error: error_description });
      return res.redirect(`${process.env.FRONTEND_URI}/error?error=${error_description}`);
    }

    const sessionResponse = await this.XServices.getOAuthSession(state);
    if (!sessionResponse.codeVerifier) {
      return res.redirect(`${process.env.FRONTEND_URI}/error?error=auth-not-found}`);
    }

    await this.XServices.markSessionAsUsed(sessionResponse.id);
    const accessTokenResponse = await this.XServices.getAccessToken(
      sessionResponse.codeVerifier,
      code,
    );

    const xUserInfo = await this.XServices.getXUserInfo(accessTokenResponse.data.access_token);

    await this.XServices.createDbUsersXConnection(
      sessionResponse.ownerid,
      xUserInfo.data,
      accessTokenResponse.data,
    );

    this.logger.info('connection successfull', { username: xUserInfo.data.data.username });

    res.redirect(`${process.env.FRONTEND_URI}/dashboard`);
  });
}
