import { NextFunction, Request, Response } from 'express';
import { ApiError, IApiError } from '../utils/apiError.js';
import { ZodError } from 'zod';
import logger from '../config/logger.config.js';

export const handleError = (err: any, req: Request, res: Response, next:NextFunction) => {
  console.log(err);
  let error: IApiError | ApiError | Error | ZodError | any = err;

  const IsInDevelopment = process.env.NODE_ENV === 'development';

  if (!(error instanceof ApiError)) {
    if (error instanceof ZodError) {
      const statusCode = 400;
      const message =
        error && (error as ZodError).message
          ? (error as ZodError).issues[0].message
          : 'Validation error';
      const errors = (error as ZodError).issues || [];
      error = new ApiError(statusCode, message, errors, error.stack);
      logger.error(`Input Validation Error : ${error}`)
    } else {
      const statusCode = error && error.statusCode ? error.statusCode : 500;
      const message = error && error.message ? error.message : 'Something Went Wrong';

      error = new ApiError(statusCode, message, error.errors || [], error.stack);
      logger.error(`Implementation error : ${error}`)
    }
  }


  const response: ResponseType = {
    success: false,
    message: error.message,
    errors: error.errors || [],
    stack: undefined,
  };

  if (IsInDevelopment) response.stack = error.stack;

  res.status(error.statusCode || 500).json(response);
};

export type ResponseType = {
  success: boolean;
  message: string;
  data?: object;
  errors: unknown[];
  stack?: string;
};
