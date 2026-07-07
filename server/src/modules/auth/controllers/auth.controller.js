import crypto from 'node:crypto';
import User from '../models/user.model.js';
import env from '../../../config/env.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { authCookieOptions, signAccessToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../services/email.service.js';

const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const issueAuthentication = (res, user, statusCode, message) => {
  const token = signAccessToken(user.id);
  res.cookie('access_token', token, authCookieOptions);
  return res.status(statusCode).json(new ApiResponse(statusCode, { user: publicUser(user), token }, message));
};

export const register = async (req, res) => {
  const { fullName, email, phone, password } = req.validatedBody;
  const existingUser = await User.exists({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(409, 'An account with this email already exists');

  const user = await User.create({ fullName, email: email.toLowerCase(), phone, password });
  return issueAuthentication(res, user, 201, 'Registration successful');
};

export const login = async (req, res) => {
  const { email, password } = req.validatedBody;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +isActive');
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  return issueAuthentication(res, user, 200, 'Login successful');
};

export const logout = async (req, res) => {
  const { maxAge, ...clearOptions } = authCookieOptions;
  res.clearCookie('access_token', clearOptions);
  return res.status(200).json(new ApiResponse(200, null, 'Logout successful'));
};

export const getCurrentUser = async (req, res) => res
  .status(200)
  .json(new ApiResponse(200, { user: publicUser(req.user) }, 'Current user retrieved'));

export const updateProfile = async (req, res) => {
  if (Object.keys(req.validatedBody).length === 0) throw new ApiError(422, 'Provide at least one profile field to update');
  const updates = { ...req.validatedBody };
  if (updates.email) updates.email = updates.email.toLowerCase();

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updates },
    { new: true, runValidators: true },
  );
  return res.status(200).json(new ApiResponse(200, { user: publicUser(user) }, 'Profile updated'));
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.validatedBody;
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw new ApiError(401, 'Current password is incorrect');
  if (await user.comparePassword(newPassword)) throw new ApiError(422, 'New password must differ from the current password');

  user.password = newPassword;
  await user.save();
  return issueAuthentication(res, user, 200, 'Password changed successfully');
};

export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.validatedBody.email.toLowerCase(), isActive: true });
  const genericMessage = 'If an account exists for that email, a password reset link has been sent';
  if (!user) return res.status(200).json(new ApiResponse(200, null, genericMessage));

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${env.clientUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

  if (!env.smtp.configured && !env.isProduction) {
    return res.status(200).json(new ApiResponse(200, { resetToken, resetUrl }, genericMessage));
  }

  try {
    await sendPasswordResetEmail({ email: user.email, fullName: user.fullName, resetUrl });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw error;
  }
  return res.status(200).json(new ApiResponse(200, null, genericMessage));
};

export const resetPassword = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw new ApiError(400, 'Password reset token is invalid or has expired');
  user.password = req.validatedBody.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return issueAuthentication(res, user, 200, 'Password reset successful');
};

