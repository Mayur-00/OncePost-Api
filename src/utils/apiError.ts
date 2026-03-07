class ApiError extends Error implements IApiError {
  statusCode: number;
  message: string;
  data: any | null;
  success: boolean;
  errors: any[];
  error_code?:string;
  stack?: string | undefined;

  constructor(statusCode: number, message = 'Something Went wrong', error: any[] = [], error_code= 'IMPLEMENTATION_ERROR',  stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
    this.success = false;
    this.errors = error;
    this.error_code = error_code

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
  data: any | null;
  success: boolean;
  errors: any[];
  error_code?:string;
  stack?: string | undefined;
}

export { ApiError, IApiError };
