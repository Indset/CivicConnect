export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true, errors = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', errors = []) {
    super(message, 400, true, errors);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', errors = []) {
    super(message, 401, true, errors);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', errors = []) {
    super(message, 403, true, errors);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errors = []) {
    super(message, 404, true, errors);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422, true, errors);
    this.name = 'ValidationError';
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', errors = []) {
    super(message, 500, false, errors);
    this.name = 'InternalServerError';
  }
}
