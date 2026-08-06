/**
 * Base application error class.
 * All custom errors extend from this.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * 400 Bad Request — input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * 401 Unauthorized — missing or invalid authentication
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden — authenticated but lacking permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found — resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict — resource state conflict (e.g. duplicate)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 429 Too Many Requests — rate limit exceeded
 */
export class RateLimitedError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMITED', message, 429);
    this.name = 'RateLimitedError';
  }
}
