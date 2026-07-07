import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String, required: [true, 'Category name is required'], trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [80, 'Category name cannot exceed 80 characters'],
  },
  icon: {
    type: String, trim: true, maxlength: [2048, 'Icon value is too long'], default: '',
  },
  description: {
    type: String, trim: true, maxlength: [500, 'Description cannot exceed 500 characters'], default: '',
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false, strict: 'throw' });

categorySchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 }, name: 'category_name_unique' },
);
categorySchema.index({ isActive: 1, name: 1 });

export default mongoose.models.Category ?? mongoose.model('Category', categorySchema);
