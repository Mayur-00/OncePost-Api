interface IApiResponse {
  statusCode: number;
  data: unknown;
  message: string;
  success: boolean;
}

export class ApiResponse implements IApiResponse {
  statusCode: number;
  data: unknown;
  message: string;
  success: boolean;

  constructor(statusCode: number, data: unknown, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
