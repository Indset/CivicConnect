import mongoose from "mongoose";

const driveLocationSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
  },
  { _id: false },
);

const driveSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    location: { type: driveLocationSchema, required: true },
    date: { type: Date, required: true, index: true },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    organizer: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
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
    status: {
      type: String,
      enum: ["upcoming", "completed"],
      default: "upcoming",
      index: true,
    },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    maxParticipants: { type: Number, min: 1, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  { timestamps: true, versionKey: false, strict: "throw" },
);

driveSchema.pre("validate", function validateDriveTimes(next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate("endTime", "endTime must be later than startTime");
  }
  const { lat, lng } = this.location?.coordinates ?? {};
  if ((lat === undefined) !== (lng === undefined)) {
    this.invalidate(
      "location.coordinates",
      "Latitude and longitude must be provided together",
    );
  }
  next();
});

driveSchema.index({ date: 1, startTime: 1 });
driveSchema.index({ participants: 1 });

export default mongoose.models.Drive ?? mongoose.model("Drive", driveSchema);
