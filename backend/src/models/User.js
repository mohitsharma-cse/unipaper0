import mongoose from 'mongoose';

export const ADMIN_PERMISSIONS = [
  'dashboard:read',
  'folders:read',
  'folders:write',
  'folders:delete',
  'files:read',
  'files:write',
  'files:delete',
  'reviews:read',
  'reviews:moderate',
  'admins:read',
  'admins:write',
  'audit:read'
];

export const ROLE_PRESETS = {
  read_only: [
    'dashboard:read',
    'folders:read',
    'files:read',
    'reviews:read'
  ],
  writer: [
    'dashboard:read',
    'folders:read',
    'folders:write',
    'files:read',
    'files:write',
    'reviews:read'
  ],
  manager: [
    'dashboard:read',
    'folders:read',
    'folders:write',
    'folders:delete',
    'files:read',
    'files:write',
    'files:delete',
    'reviews:read',
    'reviews:moderate',
    'audit:read'
  ],
  admin: [
    'dashboard:read',
    'folders:read',
    'folders:write',
    'folders:delete',
    'files:read',
    'files:write',
    'files:delete',
    'reviews:read',
    'reviews:moderate',
    'admins:read',
    'admins:write',
    'audit:read'
  ],
  super_admin: ['*']
};

export const normalizePermissions = (permissions = []) => {
  if (permissions.includes('*')) {
    return ['*'];
  }

  return [...new Set(permissions.filter((permission) => ADMIN_PERMISSIONS.includes(permission)))];
};

export const permissionsForRole = (role = 'read_only') => ROLE_PRESETS[role] || ROLE_PRESETS.read_only;

export const getEffectivePermissions = (user) => {
  const savedPermissions = normalizePermissions(user?.permissions || []);

  if (savedPermissions.length) {
    return savedPermissions;
  }

  return normalizePermissions(permissionsForRole(user?.role));
};

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['read_only', 'writer', 'manager', 'admin', 'super_admin'],
      default: 'admin'
    },
    permissions: {
      type: [String],
      default: undefined,
      set: normalizePermissions
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastLoginAt: {
      type: Date
    }
  },
  { timestamps: true }
);

userSchema.pre('validate', function setDefaultPermissions(next) {
  if (!this.permissions || this.permissions.length === 0) {
    this.permissions = normalizePermissions(permissionsForRole(this.role));
  }

  next();
});

export const User = mongoose.model('User', userSchema);
