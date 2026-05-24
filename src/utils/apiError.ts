class ApiError extends Error implements IApiError {
  statusCode: number;
  message: string;
  data: unknown | null;
  success: boolean;
  error_code?: string;
  errors: unknown[];
  stack?: string | undefined;

  constructor(
    statusCode: number,
    message = 'Something Went wrong',
    error_code = 'IMPLEMENTATION_ERROR',
    error: unknown[] = [],
    stack = '',
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
    this.success = false;
    this.errors = error;
    this.error_code = error_code;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

interface IApiError {
  statusCode: number;
  message: string;
  data: unknown | null;
  success: boolean;
  errors: unknown[];
  error_code?: string;
  stack?: string | undefined;
}

export { ApiError, IApiError };
