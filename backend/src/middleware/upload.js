import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadPdf = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfName = file.originalname.toLowerCase().endsWith('.pdf');

    if (isPdfMime || isPdfName) {
      return cb(null, true);
    }

    return cb(new Error('Only PDF files are allowed.'));
  }
});
