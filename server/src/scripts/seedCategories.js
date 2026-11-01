import { connectDatabase, disconnectDatabase } from "../config/database.js";
import env from "../config/env.js";
import Category from "../modules/categories/models/category.model.js";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const categories = [
  {
    name: "Roads & Potholes",
    icon: "road",
    description: "Roads, streets, potholes, sidewalks, pavements, and damaged bridges.",
  },
  {
    name: "Garbage & Sanitation",
    icon: "trash",
    description: "Garbage collection, litter, waste disposal, cleanliness, and sanitation.",
  },
  {
    name: "Sewage & Drainage",
    icon: "drain",
    description: "Sewage, sewer lines, blocked drains, and drainage overflow.",
  },
  {
    name: "Water Supply",
    icon: "water",
    description: "Water supply interruptions, leaking pipes, taps, and water quality.",
  },
  {
    name: "Street Lights & Electricity",
    icon: "lightbulb",
    description: "Street lights, electricity outages, exposed wires, and power issues.",
  },
  {
    name: "Public Transport & Traffic",
    icon: "bus",
    description: "Public transport, buses, traffic signals, congestion, and road safety.",
  },
  {
    name: "Parks & Public Spaces",
    icon: "trees",
    description: "Parks, gardens, playgrounds, benches, and shared public spaces.",
  },
  {
    name: "Noise Pollution",
    icon: "volume-2",
    description: "Excessive noise, loud music, honking, and noise pollution.",
  },
  {
    name: "Air & Environment",
    icon: "leaf",
    description: "Air pollution, smoke, dust, emissions, and environmental concerns.",
  },
  {
    name: "Stray Animals",
    icon: "paw-print",
    description: "Stray animals, animal safety, bites, and related neighborhood concerns.",
  },
  {
    name: "Encroachment & Illegal Construction",
    icon: "building",
    description: "Encroachment, illegal construction, unauthorized buildings, and blocked public ways.",
  },
  {
    name: "Other",
    icon: "circle-help",
    description: "Other civic issues that do not fit an available category.",
  },
];

const seed = async () => {
  await connectDatabase();
  try {
    let inserted = 0;
    let updated = 0;
    for (const category of categories) {
      const result = await Category.updateOne(
        { name: category.name },
        { $set: { ...category, isActive: true } },
        {
          upsert: true,
          runValidators: true,
          collation: { locale: "en", strength: 2 },
        },
      );
      if (result.upsertedCount) inserted += 1;
      else if (result.modifiedCount) updated += 1;
    }

    console.log(
      `Seeded ${categories.length} categories using ${env.nodeEnv} configuration (${inserted} inserted, ${updated} updated).`,
    );
  } finally {
    await disconnectDatabase();
  }
};

seed().catch((error) => {
  console.error("Category seed failed:", error.message);
  process.exitCode = 1;
});
