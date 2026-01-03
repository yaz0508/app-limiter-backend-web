import { prisma } from "../prisma/client";

/**
 * Seed default categories: Games, Social Media, Others
 * These categories are created empty - admin will add apps to them via admin dashboard
 */
async function seedDefaultCategories() {
  console.log("🌱 Seeding default categories...");

  try {
    // Check if categories already exist
    const existingGames = await prisma.appCategory.findUnique({
      where: { name: "Games" },
    });
    const existingSocialMedia = await prisma.appCategory.findUnique({
      where: { name: "Social Media" },
    });
    const existingOthers = await prisma.appCategory.findUnique({
      where: { name: "Others" },
    });

    if (!existingGames) {
      await prisma.appCategory.create({
        data: {
          name: "Games",
          description: "Gaming applications",
        },
      });
      console.log("✓ Created 'Games' category");
    } else {
      console.log("⚠ 'Games' category already exists");
    }

    if (!existingSocialMedia) {
      await prisma.appCategory.create({
        data: {
          name: "Social Media",
          description: "Social networking and communication apps",
        },
      });
      console.log("✓ Created 'Social Media' category");
    } else {
      console.log("⚠ 'Social Media' category already exists");
    }

    if (!existingOthers) {
      await prisma.appCategory.create({
        data: {
          name: "Others",
          description: "Other applications",
        },
      });
      console.log("✓ Created 'Others' category");
    } else {
      console.log("⚠ 'Others' category already exists");
    }

    console.log("");
    console.log("✅ Default categories seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding default categories:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedDefaultCategories()
  .then(() => {
    console.log("Script completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

