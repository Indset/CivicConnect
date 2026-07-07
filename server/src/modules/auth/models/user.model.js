import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true, maxlength: [200, 'Street cannot exceed 200 characters'] },
  city: { type: String, trim: true, maxlength: [100, 'City cannot exceed 100 characters'] },
  state: { type: String, trim: true, maxlength: [100, 'State cannot exceed 100 characters'] },
  postalCode: { type: String, trim: true, maxlength: [20, 'Postal code cannot exceed 20 characters'] },
  country: { type: String, trim: true, maxlength: [100, 'Country cannot exceed 100 characters'], default: 'India' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: {
    type: String, required: [true, 'Full name is required'], trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters'],
  },
  email: {
    type: String, required: [true, 'Email is required'], unique: true,
    lowercase: true, trim: true, maxlength: [254, 'Email cannot exceed 254 characters'],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
  },
  phone: {
    type: String, required: [true, 'Phone number is required'], trim: true,
    match: [/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number'],
  },
  password: {
    type: String, required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'], maxlength: 72, select: false,
  },
  role: { type: String, enum: ['citizen', 'admin'], default: 'citizen', immutable: true },
  avatar: {
    type: String, trim: true, maxlength: [2048, 'Avatar URL is too long'], default: '',
    validate: {
      validator: (value) => !value || /^https?:\/\//i.test(value),
      message: 'Avatar must be a valid HTTP(S) URL',
    },
  },
  address: { type: addressSchema, default: () => ({}) },
  isActive: { type: Boolean, default: true, select: false },
  passwordChangedAt: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
}, {
  timestamps: true, versionKey: false, strict: 'throw',
  toJSON: { transform: (_, value) => { delete value.password; return value; } },
  toObject: { transform: (_, value) => { delete value.password; return value; } },
});

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
    return next();
  } catch (error) { return next(error); }
});
userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtIssuedAt) {
  return this.passwordChangedAt ? Math.floor(this.passwordChangedAt.getTime() / 1000) > jwtIssuedAt : false;
};
userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  return token;
};

export default mongoose.models.User ?? mongoose.model('User', userSchema);
