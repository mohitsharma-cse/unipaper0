import mongoose from 'mongoose';

const materialFileSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    course: {
      type: String,
      default: 'B.Tech',
      trim: true
    },
    semester: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Notes', 'Assignments', 'PYQ', 'Syllabus'],
      required: true
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      required: true
    },
    pdfUrl: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    storageProvider: {
      type: String,
      enum: ['cloudinary', 'uploadthing', 'local'],
      default: 'local'
    },
    storageKey: {
      type: String,
      default: 'local',
      trim: true
    },
    originalFileName: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: 'application/pdf'
    },
    tags: [String],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    downloads: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

materialFileSchema.index({
  title: 'text',
  subject: 'text',
  category: 'text',
  course: 'text',
  semester: 'text',
  tags: 'text'
});

materialFileSchema.index({ folderId: 1, category: 1, isActive: 1 });

export const MaterialFile = mongoose.model('MaterialFile', materialFileSchema, 'files');
