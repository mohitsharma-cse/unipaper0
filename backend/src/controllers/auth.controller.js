import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEffectivePermissions, User } from '../models/User.js';
import { authCookieOptions, clearAuthCookieOptions } from '../utils/cookieOptions.js';
import { writeAuditLog } from '../services/audit.service.js';

const signToken = (user) => jwt.sign(
  {
    id: user._id,
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'This admin account is suspended.'
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  res.cookie('token', token, authCookieOptions());

  const permissions = getEffectivePermissions(user);

  await writeAuditLog({
    action: 'LOGIN',
    adminId: user._id,
    targetType: 'User',
    targetId: user._id,
    message: `${user.email} logged in.`
  });

  return res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions
    }
  });
};

export const logout = async (req, res) => {
  res.clearCookie('token', clearAuthCookieOptions());

  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
};

export const me = async (req, res) => res.json({
  success: true,
  user: {
    id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    status: req.user.status,
    permissions: req.userPermissions || getEffectivePermissions(req.user)
  }
});
