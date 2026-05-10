import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'LOGIN',
        'CREATE_FOLDER',
        'UPDATE_FOLDER',
        'DELETE_FOLDER',
        'UPLOAD_FILE',
        'UPDATE_FILE',
        'DELETE_FILE',
        'UPDATE_REVIEW',
        'DELETE_REVIEW',
        'CREATE_ADMIN',
        'UPDATE_ADMIN',
        'DELETE_ADMIN'
      ],
      required: true
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    targetType: {
      type: String,
      enum: ['User', 'Folder', 'File', 'System']
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId
    },
    message: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
