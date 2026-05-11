import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import streamifier from 'streamifier';
import { cloudinary, configureCloudinary, hasCloudinaryConfig } from '../config/cloudinary.js';
import { createUploadThingClient, hasUploadThingConfig, UTFile } from '../config/uploadthing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const uploadsRoot = path.join(backendRoot, 'uploads');
const pdfUploadsRoot = path.join(uploadsRoot, 'pdfs');

const safeFileName = (name) => name
  .toLowerCase()
  .replace(/[^a-z0-9.]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const getPreferredStorageProvider = () => (process.env.STORAGE_PROVIDER || 'auto').toLowerCase();

export const getConfiguredStorageOptions = () => {
  const options = [];

  if (hasUploadThingConfig()) {
    options.push({
      key: 'uploadthing',
      label: process.env.UPLOADTHING_STORAGE_LABEL || 'UploadThing',
      provider: 'uploadthing'
    });
  }

  if (hasCloudinaryConfig()) {
    options.push({
      key: 'cloudinary',
      label: process.env.CLOUDINARY_STORAGE_LABEL || 'Cloudinary',
      provider: 'cloudinary'
    });
  }

  if (process.env.ENABLE_LOCAL_STORAGE_OPTION === 'true' || !options.length) {
    options.push({
      key: 'local',
      label: 'Local Server Storage',
      provider: 'local'
    });
  }

  return options;
};

export const getPublicStorageOptions = () => getConfiguredStorageOptions().map((option) => ({
  key: option.key,
  label: option.label,
  provider: option.provider
}));

const resolveStorageOption = (storageKey) => {
  const options = getConfiguredStorageOptions();

  if (storageKey) {
    const selected = options.find((option) => option.key === storageKey);

    if (!selected) {
      const error = new Error('Selected storage option is not available.');
      error.statusCode = 400;
      throw error;
    }

    return selected;
  }

  const activeProvider = getActiveStorageProvider();

  if (activeProvider.endsWith('_missing_config')) {
    const error = new Error(`${activeProvider.replace('_missing_config', '')} storage is selected but environment variables are incomplete.`);
    error.statusCode = 500;
    throw error;
  }

  return options.find((option) => option.provider === activeProvider) || options[0];
};

export const getActiveStorageProvider = () => {
  const preferred = getPreferredStorageProvider();

  if (preferred === 'uploadthing') {
    return hasUploadThingConfig() ? 'uploadthing' : 'uploadthing_missing_config';
  }

  if (preferred === 'cloudinary') {
    return hasCloudinaryConfig() ? 'cloudinary' : 'cloudinary_missing_config';
  }

  if (hasUploadThingConfig()) {
    return 'uploadthing';
  }

  if (hasCloudinaryConfig()) {
    return 'cloudinary';
  }

  return 'local';
};

export const getUploadsRoot = () => uploadsRoot;

export const resolveLocalPdfPath = (publicId) => {
  const fileName = String(publicId || '').replace(/^local:/, '');
  const targetPath = path.resolve(pdfUploadsRoot, fileName);
  const relativePath = path.relative(pdfUploadsRoot, targetPath);

  if (!fileName || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Invalid local file path.');
  }

  return targetPath;
};

export const getSignedCloudinaryPdfUrl = (publicId, { attachment = false } = {}) => {
  configureCloudinary();

  return cloudinary.utils.private_download_url(publicId, 'pdf', {
    resource_type: 'raw',
    type: 'upload',
    expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment
  });
};

const uploadToCloudinary = (buffer, originalName) => new Promise((resolve, reject) => {
  configureCloudinary();

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: 'raw',
      folder: 'unipaper/pdfs',
      use_filename: true,
      unique_filename: true,
      filename_override: originalName
    },
    (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          pdfUrl: result.secure_url,
          publicId: result.public_id,
          storageProvider: 'cloudinary',
          storageKey: 'cloudinary'
        });
      }
    }
  );

  streamifier.createReadStream(buffer).pipe(uploadStream);
});

const uploadToUploadThing = async (buffer, originalName) => {
  const client = createUploadThingClient();

  if (!client) {
    const error = new Error('UploadThing is selected but UPLOADTHING_TOKEN is missing.');
    error.statusCode = 500;
    throw error;
  }

  const fileName = safeFileName(originalName || 'material.pdf') || 'material.pdf';
  const uploadFile = new UTFile([buffer], fileName, {
    type: 'application/pdf',
    customId: `unipaper-${crypto.randomUUID()}`
  });

  const response = await client.uploadFiles(uploadFile, {
    contentDisposition: 'inline'
  });
  const result = Array.isArray(response) ? response[0] : response;

  if (!result?.data || result.error) {
    const error = new Error(result?.error?.message || 'UploadThing upload failed.');
    error.statusCode = 502;
    throw error;
  }

  return {
    pdfUrl: result.data.ufsUrl || result.data.url,
    publicId: `uploadthing:${result.data.key}`,
    storageProvider: 'uploadthing',
    storageKey: 'uploadthing'
  };
};

const uploadToLocalStorage = async (buffer, originalName) => {
  await fs.mkdir(pdfUploadsRoot, { recursive: true });
  const fileName = `${Date.now()}-${safeFileName(originalName || 'material.pdf')}`;
  const absolutePath = path.join(pdfUploadsRoot, fileName);
  await fs.writeFile(absolutePath, buffer);

  const publicUrl = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;

  return {
    pdfUrl: `${publicUrl}/uploads/pdfs/${fileName}`,
    publicId: `local:${fileName}`,
    storageProvider: 'local',
    storageKey: 'local'
  };
};

export const uploadPdfFile = async (file, storageKey) => {
  if (!file?.buffer) {
    const error = new Error('PDF file is required.');
    error.statusCode = 400;
    throw error;
  }

  const selectedStorage = resolveStorageOption(storageKey);

  if (selectedStorage.provider === 'uploadthing') {
    return uploadToUploadThing(file.buffer, file.originalname);
  }

  if (selectedStorage.provider === 'cloudinary') {
    return uploadToCloudinary(file.buffer, file.originalname);
  }

  return uploadToLocalStorage(file.buffer, file.originalname);
};

export const deletePdfFile = async ({ publicId, storageProvider }) => {
  if (!publicId) {
    return;
  }

  if (storageProvider === 'uploadthing' || publicId.startsWith('uploadthing:')) {
    const client = createUploadThingClient();
    const key = publicId.replace(/^uploadthing:/, '');

    if (!client || !key) {
      return;
    }

    await client.deleteFiles(key);
    return;
  }

  if (storageProvider === 'cloudinary' || (!storageProvider && !publicId.startsWith('local:'))) {
    configureCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    return;
  }

  if (publicId.startsWith('local:')) {
    const targetPath = resolveLocalPdfPath(publicId);
    await fs.rm(targetPath, { force: true });
  }
};
