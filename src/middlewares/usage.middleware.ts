
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { User } from '../generated/prisma/client.js';
import logger from '../config/logger.config.js';
import { jwtService } from '../modules/auth/index.js';

