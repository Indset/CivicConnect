import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import env from "../src/config/env.js";
import Drive from "../src/modules/awareness/models/drive.model.js";
import Tip from "../src/modules/awareness/models/tip.model.js";
import User from "../src/modules/auth/models/user.model.js";

const tips = [
  {
    title: "Separate waste before disposal",
    content:
      "Keep wet and dry waste in separate bins so recyclable materials can be recovered and organic waste handled safely.",
    category: "Cleanliness",
  },
  {
    title: "Keep public spaces litter-free",
    content:
      "Carry small waste with you until you find a bin, and encourage others to leave parks and streets clean.",
    category: "Cleanliness",
  },
  {
    title: "Use pedestrian crossings",
    content:
      "Cross at marked pedestrian crossings, follow traffic signals, and stay alert around moving vehicles.",
    category: "Traffic",
  },
  {
    title: "Share the road responsibly",
    content:
      "Follow lane markings, avoid blocking junctions, and give pedestrians and cyclists enough space.",
    category: "Traffic",
  },
  {
    title: "Save water at home",
    content:
      "Turn off taps when they are not in use and repair leaks quickly to prevent avoidable water loss.",
    category: "Water",
  },
  {
    title: "Report water leaks promptly",
    content:
      "Share the location of leaking public pipes with the relevant civic authority so repairs can be arranged sooner.",
    category: "Water",
  },
  {
    title: "Respect quiet hours",
    content:
      "Keep music and other loud sounds at a considerate level, especially during local quiet hours.",
    category: "Noise",
  },
  {
    title: "Protect shared property",
    content:
      "Use benches, signs, public toilets, and other shared facilities with care and report damage for repair.",
    category: "Public property",
  },
];

const dateFromToday = (offsetDays) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const drives = [
  {
    title: "Community Park Cleanup",
    description:
      "Join neighbours to collect litter, sort recyclables, and refresh a shared community park.",
    location: {
      address: "Community Park, Sector 12",
      coordinates: { lat: 28.6139, lng: 77.209 },
    },
    date: dateFromToday(14),
    startTime: "08:00",
    endTime: "10:00",
    organizer: "CivicConnect Community Team",
    maxParticipants: 40,
  },
  {
    title: "Neighbourhood Street Cleanup",
    description:
      "Help clean local streets and raise awareness about responsible waste disposal.",
    location: {
      address: "Central Market, Sector 18",
      coordinates: { lat: 28.5708, lng: 77.3261 },
    },
    date: dateFromToday(35),
    startTime: "07:30",
    endTime: "09:30",
    organizer: "Ward Community Group",
    maxParticipants: 30,
  },
  {
    title: "Lakefront Cleanliness Drive",
    description:
      "Volunteers worked together to remove litter from the public lakefront and walking path.",
    location: {
      address: "Public Lakefront, City Center",
      coordinates: { lat: 28.5355, lng: 77.391 },
    },
    date: dateFromToday(-30),
    startTime: "08:00",
    endTime: "10:00",
    organizer: "CivicConnect Community Team",
    maxParticipants: 25,
  },
];

const seed = async () => {
  await connectDatabase();
  try {
    const admin = await User.findOne({ role: "admin", isActive: true })
      .select("_id")
      .lean();
    if (!admin)
      throw new Error(
        "Cannot seed awareness content: create an active admin user first.",
      );

    for (const tip of tips) {
      await Tip.updateOne(
        { title: tip.title },
        { $setOnInsert: { ...tip, createdBy: admin._id } },
        { upsert: true, runValidators: true },
      );
    }

    for (const drive of drives) {
      await Drive.updateOne(
        { title: drive.title },
        {
          $setOnInsert: {
            ...drive,
            createdBy: admin._id,
            status: drive.date < new Date() ? "completed" : "upcoming",
          },
        },
        { upsert: true, runValidators: true },
      );
    }

    console.log(`Seeded awareness content using ${env.nodeEnv} configuration.`);
  } finally {
    await disconnectDatabase();
  }
};

seed().catch((error) => {
  console.error("Awareness seed failed:", error.message);
  process.exitCode = 1;
});
