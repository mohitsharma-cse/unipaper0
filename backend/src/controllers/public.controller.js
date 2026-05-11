import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import mongoose from 'mongoose';
import { Folder } from '../models/Folder.js';
import { MaterialFile } from '../models/MaterialFile.js';
import { buildFolderTree } from '../services/folder.service.js';
import { getActiveStorageProvider, getSignedCloudinaryPdfUrl, resolveLocalPdfPath } from '../services/storage.service.js';
import { escapeRegExp } from '../utils/escapeRegExp.js';

const parsePagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 24, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildFileFilters = (query) => {
  const filters = { isActive: true };

  ['course', 'semester', 'subject', 'category'].forEach((field) => {
    if (query[field]) {
      filters[field] = query[field];
    }
  });

  if (query.folderId && mongoose.Types.ObjectId.isValid(query.folderId)) {
    filters.folderId = query.folderId;
  }

  return filters;
};

const buildRegexSearchFilter = (query, q) => {
  const safeSearch = new RegExp(escapeRegExp(q), 'i');

  return {
    ...buildFileFilters(query),
    $or: [
      { title: safeSearch },
      { subject: safeSearch },
      { course: safeSearch },
      { semester: safeSearch },
      { category: safeSearch },
      { tags: safeSearch }
    ]
  };
};

const getApiFileUrl = (req, fileId, action) => (
  `${req.protocol}://${req.get('host')}/api/files/${fileId}/${action}`
);

const attachFileUrls = (req, file) => {
  const item = typeof file.toObject === 'function' ? file.toObject() : file;

  return {
    ...item,
    viewUrl: getApiFileUrl(req, item._id, 'pdf'),
    downloadUrl: getApiFileUrl(req, item._id, 'download')
  };
};

const getActiveFileOr404 = async (id) => {
  const file = await MaterialFile.findOne({
    _id: id,
    isActive: true
  });

  if (!file) {
    const error = new Error('File not found.');
    error.statusCode = 404;
    throw error;
  }

  return file;
};

const getPdfFileName = (file) => {
  const fallbackName = `${file.title || 'material'}.pdf`;
  const rawName = file.originalFileName || fallbackName;
  const cleanedName = rawName
    .replace(/[<>:"/\\|?*\r\n]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const fileName = cleanedName || fallbackName;
  return fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
};

const getContentDisposition = (type, fileName) => {
  const fallbackName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

const getRemotePdfUrl = (file, attachment) => {
  if (file.storageProvider === 'cloudinary' && file.publicId) {
    return getSignedCloudinaryPdfUrl(file.publicId, { attachment });
  }

  return file.pdfUrl;
};

const streamRemotePdf = async (file, res, attachment) => {
  const response = await fetch(getRemotePdfUrl(file, attachment));

  if (!response.ok || !response.body) {
    const providerError = response.headers.get('x-cld-error');
    const error = new Error(
      providerError
        ? `PDF storage rejected the file: ${providerError}.`
        : 'PDF file could not be loaded from storage.'
    );
    error.statusCode = response.status === 404 ? 404 : 502;
    throw error;
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    res.setHeader('Content-Length', contentLength);
  }

  await pipeline(Readable.fromWeb(response.body), res);
};

const sendStoredPdf = async (file, res, { attachment = false } = {}) => {
  const fileName = getPdfFileName(file);
  const disposition = attachment ? 'attachment' : 'inline';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', getContentDisposition(disposition, fileName));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=300');

  if (file.storageProvider === 'local' && file.publicId?.startsWith('local:')) {
    await new Promise((resolve, reject) => {
      res.sendFile(resolveLocalPdfPath(file.publicId), (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    return;
  }

  await streamRemotePdf(file, res, attachment);
};

export const health = async (req, res) => res.json({
  success: true,
  name: 'Unipaper API',
  status: 'ok',
  time: new Date().toISOString()
});

export const readiness = async (req, res) => {
  const ready = mongoose.connection.readyState === 1;

  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ready' : 'not_ready',
    database: {
      connected: ready,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null
    },
    storage: {
      provider: getActiveStorageProvider()
    }
  });
};

export const apiDocs = async (req, res) => res.json({
  success: true,
  name: 'Unipaper API',
  version: '1.0.0',
  storageMode: getActiveStorageProvider(),
  publicRoutes: [
    'GET /api/health',
    'GET /api/ready',
    'GET /api/docs',
    'GET /api/folders',
    'GET /api/folders/:id/files',
    'GET /api/files?course=&semester=&subject=&category=&folderId=',
    'GET /api/files/search?q=',
    'GET /api/files/:id',
    'GET /api/files/:id/pdf',
    'GET /api/files/:id/download',
    'POST /api/files/:id/download'
  ],
  authRoutes: [
    'POST /api/auth/login',
    'POST /api/auth/logout',
    'GET /api/auth/me'
  ],
  adminRoutes: [
    'GET /api/admin/stats',
    'GET /api/admin/folders',
    'POST /api/admin/folders',
    'PUT /api/admin/folders/:id',
    'DELETE /api/admin/folders/:id',
    'GET /api/admin/files',
    'POST /api/admin/files',
    'PUT /api/admin/files/:id',
    'DELETE /api/admin/files/:id',
    'GET /api/admin/audit-logs',
    'GET /api/admin/reviews',
    'PATCH /api/admin/reviews/:id',
    'DELETE /api/admin/reviews/:id'
  ],
  reviewRoutes: [
    'GET /api/reviews',
    'POST /api/reviews'
  ]
});

export const getFolders = async (req, res) => {
  const folders = await Folder.find().sort({ path: 1 });

  res.json({
    success: true,
    folders: buildFolderTree(folders)
  });
};

export const getFolderFiles = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filters = {
    isActive: true,
    folderId: req.params.id
  };

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
    files: files.map((file) => attachFileUrls(req, file)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
  });
};

export const listFiles = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filters = buildFileFilters(req.query);

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
    files: files.map((file) => attachFileUrls(req, file)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
  });
};

export const searchFiles = async (req, res) => {
  const q = req.query.q?.trim();
  const { page, limit, skip } = parsePagination(req.query);

  if (!q) {
    return res.json({
      success: true,
      files: [],
      pagination: { page, limit, total: 0, pages: 1 }
    });
  }

  const textFilters = {
    ...buildFileFilters(req.query),
    $text: { $search: q }
  };

  let files;
  let total;
  let searchMode = 'text';

  try {
    [files, total] = await Promise.all([
      MaterialFile.find(textFilters, { score: { $meta: 'textScore' } })
        .populate('folderId', 'name path type')
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MaterialFile.countDocuments(textFilters)
    ]);
  } catch (error) {
    const regexFilters = buildRegexSearchFilter(req.query, q);
    searchMode = 'regex_fallback';

    [files, total] = await Promise.all([
      MaterialFile.find(regexFilters)
        .populate('folderId', 'name path type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MaterialFile.countDocuments(regexFilters)
    ]);
  }

  res.json({
    success: true,
    files: files.map((file) => attachFileUrls(req, file)),
    searchMode,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
  });
};

export const getFileById = async (req, res) => {
  const file = await MaterialFile.findOne({
    _id: req.params.id,
    isActive: true
  }).populate('folderId', 'name path type');

  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'File not found.'
    });
  }

  return res.json({
    success: true,
    file: attachFileUrls(req, file)
  });
};

export const previewFilePdf = async (req, res) => {
  const file = await getActiveFileOr404(req.params.id);
  await sendStoredPdf(file, res, { attachment: false });
};

export const downloadFilePdf = async (req, res) => {
  const file = await getActiveFileOr404(req.params.id);

  if (req.query.counted !== '1') {
    void MaterialFile.updateOne(
      { _id: file._id },
      { $inc: { downloads: 1 } }
    ).catch((error) => {
      console.error('Failed to record download:', error.message);
    });
  }

  await sendStoredPdf(file, res, { attachment: true });
};

export const registerDownload = async (req, res) => {
  const file = await MaterialFile.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    { $inc: { downloads: 1 } },
    { new: true }
  );

  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'File not found.'
    });
  }

  return res.json({
    success: true,
    pdfUrl: `${getApiFileUrl(req, file._id, 'download')}?counted=1`,
    viewUrl: getApiFileUrl(req, file._id, 'pdf'),
    downloads: file.downloads
  });
};
