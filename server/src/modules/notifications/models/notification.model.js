import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Notification recipient is required'], immutable: true,
  },
  title: {
    type: String, required: [true, 'Notification title is required'], trim: true,
    minlength: [2, 'Title must be at least 2 characters'], maxlength: [150, 'Title cannot exceed 150 characters'],
  },
  message: {
    type: String, required: [true, 'Notification message is required'], trim: true,
    minlength: [2, 'Message must be at least 2 characters'], maxlength: [1000, 'Message cannot exceed 1000 characters'],
  },
  type: {
    type: String,
    enum: [
      'complaint_created',
      'complaint_status',
      'complaint_assigned',
      'complaint_upvote_milestone',
      'remark_added',
      'system',
    ],
    default: 'system',
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
  strict: 'throw',
});

notificationSchema.pre('save', function synchronizeReadTime(next) {
  if (this.isModified('isRead')) this.readAt = this.isRead ? (this.readAt ?? new Date()) : null;
  next();
});
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ complaint: 1, createdAt: -1 }, { sparse: true });

export default mongoose.models.Notification ?? mongoose.model('Notification', notificationSchema);
