import { UTApi, UTFile } from 'uploadthing/server';

const isRealValue = (value) => Boolean(
  value
    && !value.includes('PASTE_')
    && !value.includes('_HERE')
    && value.trim() !== ''
);

export const hasUploadThingConfig = () => isRealValue(process.env.UPLOADTHING_TOKEN);

export const hasUploadThingToken = (token) => isRealValue(token);

export const createUploadThingClient = (token = process.env.UPLOADTHING_TOKEN) => {
  if (!hasUploadThingToken(token)) {
    return null;
  }

  return new UTApi({
    token
  });
};

export { UTFile };
