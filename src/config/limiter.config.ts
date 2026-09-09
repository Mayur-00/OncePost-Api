import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apiError.js';

export const limiter = rateLimit({
  max: 100,
  handler: (req, res, next, options) => {
    throw new ApiError(options.statusCode, "You've exceeded the request limit. Slow down!");
  },
  standardHeaders: true,
  legacyHeaders: false,
});
