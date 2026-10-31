import mongoose from "mongoose";

const tipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 150,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    category: {
      type: String,
      required: true,
      enum: ["Cleanliness", "Traffic", "Water", "Noise", "Public property"],
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
      validate: {
        validator: (value) => !value || /^https?:\/\//i.test(value),
        message: "Image URL must be a valid HTTP(S) URL",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    strict: "throw",
  },
);

tipSchema.index({ category: 1, createdAt: -1 });

export default mongoose.models.Tip ?? mongoose.model("Tip", tipSchema);
