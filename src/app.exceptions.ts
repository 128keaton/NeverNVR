import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class AppExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    let message = exception.message;

    if (exceptionResponse.hasOwnProperty('message')) {
      if (Array.isArray(exceptionResponse['message'])) {
        message = exceptionResponse['message'].join(', ');
      } else if (typeof exceptionResponse['message'] === 'string') {
        message = exceptionResponse['message'];
      }
    }
    exception.initCause();

    let responseStatus = HttpStatus.OK;

    if (status === HttpStatus.UNAUTHORIZED)
      responseStatus = HttpStatus.UNAUTHORIZED;

    return response.status(responseStatus).json({
      statusCode: responseStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      success: false,
    });
  }
}
