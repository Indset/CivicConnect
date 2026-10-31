import User from "../../auth/models/user.model.js";
import { verifyAccessToken } from "../../auth/utils/jwt.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;
  const token = req.cookies?.access_token ?? bearerToken;
  if (!token) return next();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next();
  }
  const user = await User.findById(payload.sub).select("_id role +isActive");
  if (user?.isActive) req.user = user;
  return next();
});
