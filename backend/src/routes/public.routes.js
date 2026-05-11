import { Router } from 'express';
import {
  apiDocs,
  downloadFilePdf,
  getFileById,
  getFolderFiles,
  getFolders,
  health,
  listFiles,
  previewFilePdf,
  readiness,
  registerDownload,
  searchFiles
} from '../controllers/public.controller.js';
import { listApprovedReviews, submitReview } from '../controllers/review.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/health', asyncHandler(health));
router.get('/ready', asyncHandler(readiness));
router.get('/docs', asyncHandler(apiDocs));
router.get('/folders', asyncHandler(getFolders));
router.get('/folders/:id/files', asyncHandler(getFolderFiles));
router.get('/files', asyncHandler(listFiles));
router.get('/files/search', asyncHandler(searchFiles));
router.get('/files/:id/pdf', asyncHandler(previewFilePdf));
router.get('/files/:id/download', asyncHandler(downloadFilePdf));
router.get('/files/:id', asyncHandler(getFileById));
router.post('/files/:id/download', asyncHandler(registerDownload));
router.get('/reviews', asyncHandler(listApprovedReviews));
router.post(
  '/reviews',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'),
    body('role').trim().isLength({ min: 2, max: 120 }).withMessage('Role must be 2-120 characters.'),
    body('quote').trim().isLength({ min: 5, max: 220 }).withMessage('Review must be 5-220 characters.')
  ],
  validateRequest,
  asyncHandler(submitReview)
);

export default router;
