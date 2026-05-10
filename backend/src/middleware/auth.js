import jwt from 'jsonwebtoken';
import { getEffectivePermissions, User } from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Please log in as admin.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id username email role permissions status');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Admin account no longer exists.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This admin account is suspended.'
      });
    }

    req.user = user;
    req.userPermissions = getEffectivePermissions(user);
    return next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

export const hasPermission = (user, permission, permissions = []) => (
  user?.role === 'super_admin'
  || permissions.includes('*')
  || permissions.includes(permission)
);

export const requirePermission = (...requiredPermissions) => (req, res, next) => {
  const permissions = req.userPermissions || getEffectivePermissions(req.user);
  const allowed = requiredPermissions.some((permission) => hasPermission(req.user, permission, permissions));

  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission for this admin action.'
    });
  }

  return next();
};
