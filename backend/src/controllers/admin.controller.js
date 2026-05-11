import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { Folder } from '../models/Folder.js';
import { MaterialFile } from '../models/MaterialFile.js';
import { deletePdfFile, getPublicStorageOptions, uploadPdfFile } from '../services/storage.service.js';
import { buildFolderTree, getDescendantFolderIds, refreshDescendantPaths } from '../services/folder.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { escapeRegExp } from '../utils/escapeRegExp.js';

const parseTags = (tags) => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);      
  }

  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim()).filter(Boolean);  
    }
    // JSON.parse succeeded but returned a primitive â€” treat as single tag
    return [String(parsed).trim()].filter(Boolean);
  } catch (error) {
    // Plain comma-separated string like "dbms, notes, unit 1"
    return String(tags)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
};

export const getStats = async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalFiles,
    totalFolders,
    totalDownloads,
    recentUploads,
    categoryStats
  ] = await Promise.all([
    MaterialFile.countDocuments({ isActive: true }),
    Folder.countDocuments(),
    MaterialFile.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, downloads: { $sum: '$downloads' } } }     
    ]),
    MaterialFile.countDocuments({ createdAt: { $gte: startOfMonth }, isActive: true }),
    MaterialFile.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);

  res.json({
    success: true,
    stats: {
      totalFiles,
      totalFolders,
      totalDownloads: totalDownloads[0]?.downloads || 0,
      recentUploads,
      categoryStats
    }
  });
};

export const createFolder = async (req, res) => {
  const { name, type, parent, icon } = req.body;
  let parentFolder = null;

  if (parent) {
    parentFolder = await Folder.findById(parent);

    if (!parentFolder) {
      return res.status(404).json({
        success: false,
        message: 'Parent folder not found.'
      });
    }
  }

  const folder = await Folder.create({
    name,
    type,
    parent: parentFolder?._id || null,
    icon: icon || '<i class="fa-solid fa-folder"></i>',
    path: parentFolder ? `${parentFolder.path}/${name}` : name,        
    createdBy: req.user._id
  });

  await writeAuditLog({
    action: 'CREATE_FOLDER',
    adminId: req.user._id,
    targetType: 'Folder',
    targetId: folder._id,
    message: `Created folder ${folder.path}.`
  });

  res.status(201).json({
    success: true,
    folder
  });
};

export const updateFolder = async (req, res) => {
  const folder = await Folder.findById(req.params.id);

  if (!folder) {
    return res.status(404).json({
      success: false,
      message: 'Folder not found.'
    });
  }

  if (req.body.name) {
    folder.name = req.body.name;
  }

  if (req.body.type) {
    folder.type = req.body.type;
  }

  const parentFolder = folder.parent ? await Folder.findById(folder.parent) : null;
  folder.path = parentFolder ? `${parentFolder.path}/${folder.name}` : folder.name;
  await folder.save();

  // Update metadata for files in THIS folder if it was renamed
  if (req.body.name) {
    const fileUpdates = {};
    if (folder.type === 'course') fileUpdates.course = folder.name;
    if (folder.type === 'semester') fileUpdates.semester = folder.name;
    if (folder.type === 'subject') fileUpdates.subject = folder.name;
    if (folder.type === 'category') fileUpdates.category = folder.name;

    if (Object.keys(fileUpdates).length > 0) {
      await MaterialFile.updateMany({ folderId: folder._id }, { $set: fileUpdates });
    }
  }

  await refreshDescendantPaths(folder);

  await writeAuditLog({
    action: 'UPDATE_FOLDER',
    adminId: req.user._id,
    targetType: 'Folder',
    targetId: folder._id,
    message: `Updated folder ${folder.path}.`
  });

  res.json({
    success: true,
    folder
  });
};

export const deleteFolder = async (req, res) => {
  const folder = await Folder.findById(req.params.id);

  if (!folder) {
    return res.status(404).json({
      success: false,
      message: 'Folder not found.'
    });
  }

  const folderIds = await getDescendantFolderIds(folder._id);
  const files = await MaterialFile.find({ folderId: { $in: folderIds } });

  await Promise.all(files.map((file) => deletePdfFile({
    publicId: file.publicId,
    storageProvider: file.storageProvider,
    storageKey: file.storageKey
  })));

  await MaterialFile.deleteMany({ folderId: { $in: folderIds } });     
  await Folder.deleteMany({ _id: { $in: folderIds } });

  await writeAuditLog({
    action: 'DELETE_FOLDER',
    adminId: req.user._id,
    targetType: 'Folder',
    targetId: folder._id,
    message: `Deleted folder ${folder.path} and ${files.length} files.`
  });

  res.json({
    success: true,
    message: 'Folder and contents deleted.',
    deletedFolders: folderIds.length,
    deletedFiles: files.length
  });
};

export const getAdminFolders = async (req, res) => {
  const folders = await Folder.find().sort({ path: 1 });

  res.json({
    success: true,
    folders,
    tree: buildFolderTree(folders)
  });
};

export const getStorageOptions = async (req, res) => {
  res.json({
    success: true,
    storageOptions: getPublicStorageOptions()
  });
};

export const uploadFile = async (req, res) => {
  const folder = await Folder.findById(req.body.folderId);

  if (!folder) {
    return res.status(404).json({
      success: false,
      message: 'Folder not found.'
    });
  }

  const storageResult = await uploadPdfFile(req.file, req.body.storageKey);

  try {
    const file = await MaterialFile.create({
      title: req.body.title,
      course: req.body.course || 'B.Tech',
      semester: req.body.semester,
      subject: req.body.subject,
      category: req.body.category,
      folderId: folder._id,
      pdfUrl: storageResult.pdfUrl,
      publicId: storageResult.publicId,
      storageProvider: storageResult.storageProvider,
      storageKey: storageResult.storageKey,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      tags: parseTags(req.body.tags),
      uploadedBy: req.user._id
    });

    await writeAuditLog({
      action: 'UPLOAD_FILE',
      adminId: req.user._id,
      targetType: 'File',
      targetId: file._id,
      message: `Uploaded ${file.title}.`
    });

    return res.status(201).json({
      success: true,
      file
    });
  } catch (error) {
    await deletePdfFile(storageResult);
    throw error;
  }
};

export const listAdminFiles = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const skip = (page - 1) * limit;
  const filters = {};

  if (req.query.search) {
    const search = new RegExp(escapeRegExp(req.query.search.trim()), 'i');
    filters.$or = [
      { title: search },
      { subject: search },
      { course: search },
      { semester: search },
      { category: search },
      { tags: search }
    ];
  }

  if (req.query.folderId && mongoose.Types.ObjectId.isValid(req.query.folderId)) {
    filters.folderId = req.query.folderId;
  }

  const [files, total] = await Promise.all([
    MaterialFile.find(filters)
      .populate('folderId', 'name path type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    MaterialFile.countDocuments(filters)
  ]);

  res.json({
    success: true,
    files,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1
    }
  });
};

export const updateFile = async (req, res) => {
  const allowedFields = ['title', 'course', 'semester', 'subject', 'category', 'folderId', 'isActive'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (req.body.tags !== undefined) {
    updates.tags = parseTags(req.body.tags);
  }

  if (updates.folderId) {
    const folderExists = await Folder.exists({ _id: updates.folderId });

    if (!folderExists) {
      return res.status(404).json({
        success: false,
        message: 'Target folder not found.'
      });
    }
  }

  const file = await MaterialFile.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  }).populate('folderId', 'name path type');

  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'File not found.'
    });
  }

  await writeAuditLog({
    action: 'UPDATE_FILE',
    adminId: req.user._id,
    targetType: 'File',
    targetId: file._id,
    message: `Updated ${file.title}.`
  });

  res.json({
    success: true,
    file
  });
};

export const deleteFile = async (req, res) => {
  const file = await MaterialFile.findById(req.params.id);

  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'File not found.'
    });
  }

  await deletePdfFile({
    publicId: file.publicId,
    storageProvider: file.storageProvider,
    storageKey: file.storageKey
  });

  await file.deleteOne();

  await writeAuditLog({
    action: 'DELETE_FILE',
    adminId: req.user._id,
    targetType: 'File',
    targetId: file._id,
    message: `Deleted ${file.title}.`
  });

  res.json({
    success: true,
    message: 'File deleted.'
  });
};

export const getAuditLogs = async (req, res) => {
  const logs = await AuditLog.find()
    .populate('adminId', 'username email')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({
    success: true,
    logs
  });
};