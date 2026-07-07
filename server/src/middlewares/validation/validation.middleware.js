import { validationResult } from 'express-validator';
import { ApiError } from '../../utils/ApiError.js';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array({ onlyFirstError: true }).map((error) => error.msg);
    return next(new ApiError(422, 'Validation failed', messages));
  }
  return next();
};

export const validate = (schema, source = 'body') => async (req, res, next) => {
  try {
    const value = await schema.validateAsync(req[source], { abortEarly: false, stripUnknown: false });
    if (source === 'body') {
      req.validatedBody = value;
    } else if (source === 'query') {
      req.validatedQuery = value;
    }
    return next();
  } catch (error) {
    const messages = error.details?.map((item) => item.message) ?? [error.message];
    return next(new ApiError(422, 'Validation failed', messages));
  }
};
