import { UTApi, UTFile } from 'uploadthing/server';

const isRealValue = (value) => Boolean(
  value
    && !value.includes('PASTE_')
    && !value.includes('_HERE')
    && value.trim() !== ''
);

export const hasUploadThingConfig = () => isRealValue(process.env.UPLOADTHING_TOKEN);

export const createUploadThingClient = () => {
  if (!hasUploadThingConfig()) {
    return null;
  }

  return new UTApi({
    token: process.env.UPLOADTHING_TOKEN
  });
};

export { UTFile };
