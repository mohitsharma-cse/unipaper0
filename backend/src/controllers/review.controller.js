import { Review } from '../models/Review.js';
import { writeAuditLog } from '../services/audit.service.js';

export const listApprovedReviews = async (req, res) => {
  const reviews = await Review.find({ status: 'approved' })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('name role quote createdAt');

  res.json({
    success: true,
    reviews
  });
};

export const submitReview = async (req, res) => {
  const { name, role, quote } = req.body;

  const review = await Review.create({
    name,
    role,
    quote,
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted for admin approval.',
    review: {
      id: review._id,
      status: review.status
    }
  });
};

export const listAdminReviews = async (req, res) => {
  const status = req.query.status || undefined;
  const filters = status ? { status } : {};

  const reviews = await Review.find(filters)
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({
    success: true,
    reviews
  });
};

export const updateReviewStatus = async (req, res) => {
  const { status } = req.body;

  // Controller-level guard (middleware also validates, but be defensive)
  const VALID_STATUSES = ['pending', 'approved', 'rejected'];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`
    });
  }

  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found.'
    });
  }

  review.status = status;
  if (status === 'approved') {
    review.approvedBy = req.user._id;
    review.approvedAt = new Date();
  }

  await review.save();

  await writeAuditLog({
    action: 'UPDATE_REVIEW',
    adminId: req.user._id,
    targetType: 'System',
    targetId: review._id,
    message: `Review from ${review.name} marked ${status}.`
  });

  res.json({
    success: true,
    review
  });
};

export const deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found.'
    });
  }

  await review.deleteOne();

  await writeAuditLog({
    action: 'DELETE_REVIEW',
    adminId: req.user._id,
    targetType: 'System',
    targetId: review._id,
    message: `Deleted review from ${review.name}.`
  });

  res.json({
    success: true,
    message: 'Review deleted.'
  });
};
