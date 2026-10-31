import crypto from 'node:crypto';
import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: {
    type: String, required: [true, 'Image URL is required'], trim: true, maxlength: 2048,
    validate: { validator: (value) => /^https?:\/\//i.test(value), message: 'Image URL must be valid' },
  },
  publicId: { type: String, trim: true, maxlength: 255, default: '' },
}, { _id: false });

const isValidLocation = (location) => {
  if (typeof location === 'string') return location.trim().length >= 3 && location.trim().length <= 500;
  if (!location || typeof location !== 'object' || Array.isArray(location)) return false;
  if (typeof location.address !== 'string' || location.address.trim().length < 3 || location.address.trim().length > 500) {
    return false;
  }
  if (location.coordinates === undefined) return true;
  const { lat, lng } = location.coordinates ?? {};
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lng) && lng >= -180 && lng <= 180;
};

const remarkSchema = new mongoose.Schema({
  message: {
    type: String, required: [true, 'Remark message is required'], trim: true,
    minlength: [1, 'Remark cannot be empty'], maxlength: [1000, 'Remark cannot exceed 1000 characters'],
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Remark author is required'] },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { _id: true });

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String, unique: true, immutable: true, default: () => `CC-${crypto.randomUUID()}`,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Complaint owner is required'], immutable: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Complaint category is required'],
  },
  title: {
    type: String, required: [true, 'Title is required'], trim: true,
    minlength: [5, 'Title must be at least 5 characters'], maxlength: [150, 'Title cannot exceed 150 characters'],
  },
  description: {
    type: String, required: [true, 'Description is required'], trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  location: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Location is required'],
    validate: { validator: isValidLocation, message: 'Location must include a valid address and optional coordinates' },
  },
  latitude: { type: Number, min: [-90, 'Latitude cannot be below -90'], max: [90, 'Latitude cannot exceed 90'] },
  longitude: { type: Number, min: [-180, 'Longitude cannot be below -180'], max: [180, 'Longitude cannot exceed 180'] },
  images: {
    type: [imageSchema], default: [],
    validate: { validator: (images) => images.length <= 4, message: 'A complaint can contain at most 4 images' },
  },
  upvotes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  upvoteCount: { type: Number, min: 0, default: 0 },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'],
    default: 'submitted', index: true,
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  remarks: { type: [remarkSchema], default: [] },
}, { timestamps: true, versionKey: false, strict: 'throw' });

complaintSchema.pre('validate', function validateCoordinates(next) {
  const hasLatitude = this.latitude !== null && this.latitude !== undefined;
  const hasLongitude = this.longitude !== null && this.longitude !== undefined;
  if (hasLatitude !== hasLongitude) {
    this.invalidate('location', 'Latitude and longitude must be provided together');
  }
  next();
});

complaintSchema.index({ user: 1, createdAt: -1 });
complaintSchema.index({ category: 1, status: 1, createdAt: -1 });
complaintSchema.index({ category: 1, status: 1, upvoteCount: -1, createdAt: -1 });
complaintSchema.index({ upvoteCount: -1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1, priority: -1 }, { sparse: true });
complaintSchema.index({ status: 1, priority: -1, createdAt: -1 });
complaintSchema.index({ latitude: 1, longitude: 1 }, { sparse: true });
complaintSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 }, { sparse: true });
complaintSchema.index({ title: 'text', description: 'text', location: 'text' }, { weights: { title: 5, location: 3, description: 1 } });

export default mongoose.models.Complaint ?? mongoose.model('Complaint', complaintSchema);
