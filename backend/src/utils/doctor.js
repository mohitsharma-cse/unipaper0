import dotenv from 'dotenv';
import { getPublicStorageOptions } from '../services/storage.service.js';

dotenv.config();

const isRealValue = (value) => Boolean(
  value
    && !value.includes('PASTE_')
    && !value.includes('_HERE')
    && value.trim() !== ''
);

const preferredStorage = (process.env.STORAGE_PROVIDER || 'auto').toLowerCase();
const publicStorageOptions = getPublicStorageOptions();
const uploadThingOptions = publicStorageOptions.filter((option) => option.provider === 'uploadthing');
const hasRealUploadThingConfig = uploadThingOptions.length > 0;
const hasRealCloudinaryConfig = Boolean(
  isRealValue(process.env.CLOUDINARY_CLOUD_NAME)
    && isRealValue(process.env.CLOUDINARY_API_KEY)
    && isRealValue(process.env.CLOUDINARY_API_SECRET)
);
const uploadThingRequired = preferredStorage === 'uploadthing';
const storageReady = preferredStorage === 'auto'
  || (preferredStorage === 'uploadthing' && hasRealUploadThingConfig)
  || preferredStorage === 'local';

const uploadThingFields = [
  ['UPLOADTHING_TOKEN', isRealValue(process.env.UPLOADTHING_TOKEN)]
];

const activeStorage = (() => {
  if (preferredStorage === 'uploadthing') return hasRealUploadThingConfig ? 'uploadthing' : 'uploadthing_missing_config';
  if (preferredStorage === 'cloudinary') return 'cloudinary_disabled_for_new_uploads';
  if (hasRealUploadThingConfig) return 'uploadthing';
  return 'local';
})();

const checks = [
  ['MONGODB_URI real Atlas URI', isRealValue(process.env.MONGODB_URI)],
  ['JWT_SECRET length >= 32', Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32)],
  ['ADMIN_EMAIL', isRealValue(process.env.ADMIN_EMAIL)],
  ['ADMIN_PASSWORD length >= 8', Boolean(isRealValue(process.env.ADMIN_PASSWORD) && process.env.ADMIN_PASSWORD.length >= 8)],
  ['CLIENT_URL', isRealValue(process.env.CLIENT_URL)],
  ['STORAGE_PROVIDER value', ['auto', 'uploadthing', 'local'].includes(preferredStorage)],
  ['Selected storage config', storageReady]
];

console.log('Unipaper backend doctor');
console.log('------------------------');

checks.forEach(([name, ok]) => {
  console.log(`${ok ? 'OK  ' : 'MISS'} ${name}`);
});

console.log(`${hasRealUploadThingConfig ? 'OK  ' : 'INFO'} UploadThing ${hasRealUploadThingConfig ? 'configured' : 'not configured'}`);
if (uploadThingRequired && !hasRealUploadThingConfig) {
  uploadThingFields.forEach(([name, ok]) => {
    console.log(`${ok ? 'OK  ' : 'MISS'} ${name}`);
  });
}

console.log(`${hasRealCloudinaryConfig ? 'OK  ' : 'INFO'} Cloudinary ${hasRealCloudinaryConfig ? 'configured as legacy fallback' : 'not configured'}`);
console.log(`INFO Active storage mode: ${activeStorage}`);
console.log(`INFO Admin upload choices: ${publicStorageOptions.map((option) => option.label).join(', ')}`);
if (uploadThingOptions.length) {
  console.log(`INFO UploadThing destinations: ${uploadThingOptions.map((option) => `${option.label} (${option.key})`).join(', ')}`);
}

const failed = checks.some(([, ok]) => !ok)
  || (uploadThingRequired && !hasRealUploadThingConfig);

if (failed) {
  console.log('\nFix missing or placeholder values in backend/.env before running the backend.');
  console.log('For UploadThing, paste UPLOADTHING_TOKEN from the UploadThing dashboard API Keys page.');
  process.exit(1);
}

console.log('\nEnvironment looks ready.');
