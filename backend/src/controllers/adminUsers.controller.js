import bcrypt from 'bcryptjs';
import {
  ADMIN_PERMISSIONS,
  getEffectivePermissions,
  normalizePermissions,
  permissionsForRole,
  ROLE_PRESETS,
  User
} from '../models/User.js';
import { writeAuditLog } from '../services/audit.service.js';

const adminPublicView = (admin) => ({
  id: admin._id,
  username: admin.username,
  email: admin.email,
  role: admin.role,
  status: admin.status,
  permissions: getEffectivePermissions(admin),
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
  lastLoginAt: admin.lastLoginAt
});

const assertSuperAdminForSuperPower = (req, role, permissions = []) => {
  const wantsSuperAdmin = role === 'super_admin' || permissions.includes('*');

  if (wantsSuperAdmin && req.user.role !== 'super_admin') {
    return 'Only a super admin can create or edit full-power admin accounts.';
  }

  return null;
};

const countSuperAdmins = () => User.countDocuments({
  role: 'super_admin',
  status: 'active'
});

export const listAdmins = async (req, res) => {
  const admins = await User.find()
    .sort({ role: 1, username: 1 })
    .select('_id username email role permissions status createdAt updatedAt lastLoginAt');

  res.json({
    success: true,
    admins: admins.map(adminPublicView),
    permissionCatalog: ADMIN_PERMISSIONS,
    rolePresets: ROLE_PRESETS
  });
};

export const createAdmin = async (req, res) => {
  const role = req.body.role || 'read_only';
  const permissions = req.body.permissions?.length
    ? normalizePermissions(req.body.permissions)
    : normalizePermissions(permissionsForRole(role));

  const superPowerError = assertSuperAdminForSuperPower(req, role, permissions);
  if (superPowerError) {
    return res.status(403).json({
      success: false,
      message: superPowerError
    });
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 12);
  const admin = await User.create({
    username: req.body.username,
    email: req.body.email,
    password: hashedPassword,
    role,
    permissions,
    status: req.body.status || 'active',
    createdBy: req.user._id
  });

  await writeAuditLog({
    action: 'CREATE_ADMIN',
    adminId: req.user._id,
    targetType: 'User',
    targetId: admin._id,
    message: `Created admin account ${admin.email}.`
  });

  res.status(201).json({
    success: true,
    admin: adminPublicView(admin)
  });
};

export const updateAdmin = async (req, res) => {
  const admin = await User.findById(req.params.id).select('+password');

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin account not found.'
    });
  }

  const nextRole = req.body.role || admin.role;
  const nextPermissions = req.body.permissions?.length
    ? normalizePermissions(req.body.permissions)
    : (req.body.role ? normalizePermissions(permissionsForRole(nextRole)) : getEffectivePermissions(admin));

  const superPowerError = assertSuperAdminForSuperPower(req, nextRole, nextPermissions);
  if (superPowerError) {
    return res.status(403).json({
      success: false,
      message: superPowerError
    });
  }

  if (
    admin.role === 'super_admin'
    && (nextRole !== 'super_admin' || req.body.status === 'suspended')
    && await countSuperAdmins() <= 1
  ) {
    return res.status(400).json({
      success: false,
      message: 'At least one active super admin must remain.'
    });
  }

  if (admin._id.equals(req.user._id) && req.body.status === 'suspended') {
    return res.status(400).json({
      success: false,
      message: 'You cannot suspend your own admin account.'
    });
  }

  ['username', 'email', 'role', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) {
      admin[field] = req.body[field];
    }
  });

  admin.permissions = nextPermissions;

  if (req.body.password) {
    admin.password = await bcrypt.hash(req.body.password, 12);
  }

  await admin.save();

  await writeAuditLog({
    action: 'UPDATE_ADMIN',
    adminId: req.user._id,
    targetType: 'User',
    targetId: admin._id,
    message: `Updated admin account ${admin.email}.`
  });

  res.json({
    success: true,
    admin: adminPublicView(admin)
  });
};

export const deleteAdmin = async (req, res) => {
  const admin = await User.findById(req.params.id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin account not found.'
    });
  }

  if (admin._id.equals(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own admin account.'
    });
  }

  if (admin.role === 'super_admin' && await countSuperAdmins() <= 1) {
    return res.status(400).json({
      success: false,
      message: 'At least one active super admin must remain.'
    });
  }

  await admin.deleteOne();

  await writeAuditLog({
    action: 'DELETE_ADMIN',
    adminId: req.user._id,
    targetType: 'User',
    targetId: admin._id,
    message: `Deleted admin account ${admin.email}.`
  });

  res.json({
    success: true,
    message: 'Admin account deleted.'
  });
};
