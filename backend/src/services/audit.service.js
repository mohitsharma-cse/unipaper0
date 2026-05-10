import { AuditLog } from '../models/AuditLog.js';

export const writeAuditLog = async ({ action, adminId, targetType, targetId, message }) => {
  try {
    await AuditLog.create({
      action,
      adminId,
      targetType,
      targetId,
      message
    });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};
