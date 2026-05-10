import { Router } from 'express';
import { body } from 'express-validator';
import {
  createFolder,
  deleteFile,
  deleteFolder,
  getAdminFolders,
  getAuditLogs,
  getStats,
  listAdminFiles,
  updateFile,
  updateFolder,
  uploadFile
} from '../controllers/admin.controller.js';
import {
  deleteReview,
  listAdminReviews,
  updateReviewStatus
} from '../controllers/review.controller.js';
import {
  createAdmin,
  deleteAdmin,
  listAdmins,
  updateAdmin
} from '../controllers/adminUsers.controller.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';
import { uploadPdf } from '../middleware/upload.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const folderValidators = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Folder name must be 2-80 characters.'),
  body('type').isIn(['course', 'semester', 'subject', 'category']).withMessage('Invalid folder type.'),
  body('parent').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Parent must be a valid folder ID.')
];

const fileMetadataValidators = [
  body('title').trim().isLength({ min: 2, max: 160 }).withMessage('Title must be 2-160 characters.'),
  body('course').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Course is too long.'),
  body('semester').trim().isLength({ min: 1, max: 60 }).withMessage('Semester is required.'),
  body('subject').trim().isLength({ min: 1, max: 100 }).withMessage('Subject is required.'),
  body('category').isIn(['Notes', 'Assignments', 'PYQ', 'Syllabus']).withMessage('Invalid category.'),
  body('folderId').isMongoId().withMessage('Valid folder ID is required.')
];

const adminAccountValidators = [
  body('username').trim().isLength({ min: 2, max: 60 }).withMessage('Username must be 2-60 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 8, max: 120 }).withMessage('Password must be 8-120 characters.'),
  body('role').optional().isIn(['read_only', 'writer', 'manager', 'admin', 'super_admin']).withMessage('Invalid admin role.'),
  body('status').optional().isIn(['active', 'suspended']).withMessage('Invalid admin status.'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array.'),
  body('permissions.*').optional().isString().trim().isLength({ min: 1, max: 40 }).withMessage('Invalid permission value.')
];

const adminAccountUpdateValidators = [
  body('username').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Username must be 2-60 characters.'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').optional({ checkFalsy: true }).isLength({ min: 8, max: 120 }).withMessage('Password must be 8-120 characters.'),
  body('role').optional().isIn(['read_only', 'writer', 'manager', 'admin', 'super_admin']).withMessage('Invalid admin role.'),
  body('status').optional().isIn(['active', 'suspended']).withMessage('Invalid admin status.'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array.'),
  body('permissions.*').optional().isString().trim().isLength({ min: 1, max: 40 }).withMessage('Invalid permission value.')
];

router.use(verifyToken);

router.get('/stats', requirePermission('dashboard:read'), asyncHandler(getStats));

router.get('/admins', requirePermission('admins:read'), asyncHandler(listAdmins));
router.post('/admins', requirePermission('admins:write'), adminAccountValidators, validateRequest, asyncHandler(createAdmin));
router.put('/admins/:id', requirePermission('admins:write'), adminAccountUpdateValidators, validateRequest, asyncHandler(updateAdmin));
router.delete('/admins/:id', requirePermission('admins:write'), asyncHandler(deleteAdmin));

router.get('/folders', requirePermission('folders:read'), asyncHandler(getAdminFolders));
router.post('/folders', requirePermission('folders:write'), folderValidators, validateRequest, asyncHandler(createFolder));
router.put(
  '/folders/:id',
  requirePermission('folders:write'),
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Folder name must be 2-80 characters.'),
    body('type').optional().isIn(['course', 'semester', 'subject', 'category']).withMessage('Invalid folder type.')
  ],
  validateRequest,
  asyncHandler(updateFolder)
);
router.delete('/folders/:id', requirePermission('folders:delete'), asyncHandler(deleteFolder));

router.get('/files', requirePermission('files:read'), asyncHandler(listAdminFiles));
router.post('/files', requirePermission('files:write'), uploadPdf.single('pdf'), fileMetadataValidators, validateRequest, asyncHandler(uploadFile));
router.put(
  '/files/:id',
  requirePermission('files:write'),
  [
    body('title').optional().trim().isLength({ min: 2, max: 160 }).withMessage('Title must be 2-160 characters.'),
    body('category').optional().isIn(['Notes', 'Assignments', 'PYQ', 'Syllabus']).withMessage('Invalid category.'),
    body('folderId').optional().isMongoId().withMessage('Valid folder ID is required.')
  ],
  validateRequest,
  asyncHandler(updateFile)
);
router.delete('/files/:id', requirePermission('files:delete'), asyncHandler(deleteFile));
router.get('/audit-logs', requirePermission('audit:read'), asyncHandler(getAuditLogs));
router.get('/reviews', requirePermission('reviews:read'), asyncHandler(listAdminReviews));
router.patch(
  '/reviews/:id',
  requirePermission('reviews:moderate'),
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid review status.')
  ],
  validateRequest,
  asyncHandler(updateReviewStatus)
);
router.delete('/reviews/:id', requirePermission('reviews:moderate'), asyncHandler(deleteReview));

export default router;
