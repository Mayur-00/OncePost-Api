import { UserServices } from './auth.services.js';
import prisma from '../../config/prisma.js';
import logger from '../../config/logger.config.js';
import { googleAuthClient } from '../../config/googleOAuth.config.js';
import { AuthController } from './auth.controller.js';
import { createAuthRoutes } from './auth.routes.js';
import { jwtToken } from '../shared/jwt/jwtCookie.service.js';
import { generateCookieOptions } from '../../lib/cookies.js';

export const userServices = new UserServices(
  prisma,
  logger,
  googleAuthClient,
  process.env.GOOGLE_CLIENT_ID!,
);

export const jwtService = new jwtToken();

export const authController = new AuthController(logger, userServices, jwtService, generateCookieOptions);

export const authRoutes = createAuthRoutes(authController);

export * from './auth.types.js';
export * from './auth.dto.js';
