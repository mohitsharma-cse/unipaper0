import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['course', 'semester', 'subject', 'category'],
      required: true
    },
    icon: {
      type: String,
      default: '<i class="fa-solid fa-folder"></i>'
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    path: {
      type: String,
      required: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

folderSchema.index({ parent: 1, name: 1 }, { unique: true });
folderSchema.index({ path: 'text', name: 'text' });

export const Folder = mongoose.model('Folder', folderSchema);
