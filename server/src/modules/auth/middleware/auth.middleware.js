import { ApiError } from '../../../utils/ApiError.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import User from '../models/user.model.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  const token = req.cookies.access_token ?? bearerToken;

  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new ApiError(401, 'Authentication token has expired');
    throw new ApiError(401, 'Invalid authentication token');
  }

  const user = await User.findById(payload.sub).select('+isActive +passwordChangedAt');
  if (!user || !user.isActive) throw new ApiError(401, 'The user for this token no longer exists');
  if (user.changedPasswordAfter(payload.iat)) throw new ApiError(401, 'Password changed recently; please log in again');

  req.user = user;
  return next();
});

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action'));
  }
  return next();
};
