import { v2 as cloudinary } from 'cloudinary';

export const hasCloudinaryConfig = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
    && !process.env.CLOUDINARY_CLOUD_NAME.includes('PASTE_')
    && !process.env.CLOUDINARY_CLOUD_NAME.includes('_HERE')
);

export const configureCloudinary = () => {
  if (!hasCloudinaryConfig()) {
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  return true;
};

export { cloudinary };
