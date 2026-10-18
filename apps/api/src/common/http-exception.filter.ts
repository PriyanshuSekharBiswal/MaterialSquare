import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - Internal error: ${
          exception instanceof Error ? exception.stack : String(exception)
        }`,
      );
    }

    if (isHttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        return response.status(status).json(exceptionResponse);
      }
      return response.status(status).json({
        statusCode: status,
        message: exceptionResponse,
      });
    }

    // Keep internal exception details in server logs only. This applies in
    // development too, so an accidentally exposed dev API cannot disclose
    // filesystem paths, SQL details, or runtime configuration to a browser.
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
}
