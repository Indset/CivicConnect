import { ApiError } from '../../../utils/ApiError.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[1-9]\d{7,14}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
const rules = {
  fullName: (value) => typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 100 ? 'Full name must be 2-100 characters' : null,
  email: (value) => typeof value !== 'string' || value.length > 254 || !emailPattern.test(value.trim()) ? 'Enter a valid email address' : null,
  phone: (value) => typeof value !== 'string' || !phonePattern.test(value.trim()) ? 'Enter a valid phone number including country code' : null,
  password: (value) => typeof value !== 'string' || !passwordPattern.test(value) ? 'Password must be 8-72 characters and include uppercase, lowercase, number, and special character' : null,
};

const validate = (fields, { optional = [], confirmPasswordFor } = {}) => (req, res, next) => {
  const errors = [];
  const sanitized = {};
  for (const field of fields) {
    const value = req.body?.[field];
    if ((value === undefined || value === '') && optional.includes(field)) continue;
    if (value === undefined || value === '') { errors.push(`${field} is required`); continue; }
    const ruleName = field.toLowerCase().includes('password') ? 'password' : field;
    const error = rules[ruleName]?.(value);
    if (error) errors.push(error);
    sanitized[field] = typeof value === 'string' && ruleName !== 'password' ? value.trim() : value;
  }
  if (confirmPasswordFor) {
    const confirmation = req.body?.confirmPassword;
    if (!confirmation) errors.push('confirmPassword is required');
    else if (confirmation !== req.body?.[confirmPasswordFor]) errors.push('Passwords do not match');
  }
  if (errors.length) return next(new ApiError(422, 'Input validation failed', errors));
  req.validatedBody = sanitized;
  return next();
};

export const validateRegistration = validate(['fullName', 'email', 'phone', 'password'], { confirmPasswordFor: 'password' });
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body ?? {};
  const errors = [];
  if (typeof email !== 'string' || email.length > 254 || !emailPattern.test(email.trim())) errors.push('Enter a valid email address');
  if (typeof password !== 'string' || password.length === 0 || password.length > 72) errors.push('Password is required');
  if (errors.length) return next(new ApiError(422, 'Input validation failed', errors));
  req.validatedBody = { email: email.trim(), password };
  return next();
};
export const validateProfileUpdate = validate(['fullName', 'email', 'phone'], { optional: ['fullName', 'email', 'phone'] });
export const validatePasswordChange = validate(['currentPassword', 'newPassword'], { confirmPasswordFor: 'newPassword' });
export const validateForgotPassword = validate(['email']);
export const validatePasswordReset = validate(['password'], { confirmPasswordFor: 'password' });
