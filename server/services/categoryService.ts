import { prisma } from "../prisma/client";

export interface CreateCategoryInput {
  name: string;
  description?: string;
  appIds?: string[];
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  appIds?: string[];
}

export interface CreateCategoryLimitInput {
  deviceId: string;
  categoryId: string;
  dailyLimitMinutes: number;
  createdById: string;
}

export const createCategory = async (input: CreateCategoryInput) => {
  const category = await prisma.appCategory.create({
    data: {
      name: input.name,
      description: input.description,
      apps: input.appIds
        ? {
            create: input.appIds.map((appId) => ({
              appId,
            })),
          }
        : undefined,
    },
    include: {
      apps: {
        include: {
          app: true,
        },
      },
    },
  });

  return category;
};

export const updateCategory = async (id: string, input: UpdateCategoryInput) => {
  // Update category basic info
  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;

  // Handle app updates
  if (input.appIds !== undefined) {
    // Delete existing category apps
    await prisma.categoryApp.deleteMany({
      where: { categoryId: id },
    });

    // Create new category apps
    if (input.appIds.length > 0) {
      await prisma.categoryApp.createMany({
        data: input.appIds.map((appId) => ({
          categoryId: id,
          appId,
        })),
      });
    }
  }

  const category = await prisma.appCategory.update({
    where: { id },
    data: updateData,
    include: {
      apps: {
        include: {
          app: true,
        },
      },
    },
  });

  return category;
};

export const deleteCategory = async (id: string) => {
  // CategoryApp will be deleted via cascade
  // CategoryLimit will need manual deletion
  await prisma.categoryLimit.deleteMany({
    where: { categoryId: id },
  });

  await prisma.appCategory.delete({
    where: { id },
  });
};

export const listCategories = async () => {
  return prisma.appCategory.findMany({
    include: {
      apps: {
        include: {
          app: true,
        },
      },
      _count: {
        select: {
          apps: true,
          limits: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const getCategory = async (id: string) => {
  return prisma.appCategory.findUnique({
    where: { id },
    include: {
      apps: {
        include: {
          app: true,
        },
      },
      _count: {
        select: {
          apps: true,
          limits: true,
        },
      },
    },
  });
};

export const createCategoryLimit = async (input: CreateCategoryLimitInput) => {
  const limit = await prisma.categoryLimit.upsert({
    where: {
      deviceId_categoryId: {
        deviceId: input.deviceId,
        categoryId: input.categoryId,
      },
    },
    create: {
      deviceId: input.deviceId,
      categoryId: input.categoryId,
      dailyLimitMinutes: input.dailyLimitMinutes,
      createdById: input.createdById,
    },
    update: {
      dailyLimitMinutes: input.dailyLimitMinutes,
    },
    include: {
      category: {
        include: {
          apps: {
            include: {
              app: true,
            },
          },
        },
      },
      device: true,
    },
  });

  return limit;
};

export const getCategoryLimitsForDevice = async (deviceId: string) => {
  return prisma.categoryLimit.findMany({
    where: { deviceId },
    include: {
      category: {
        include: {
          apps: {
            include: {
              app: true,
            },
          },
        },
      },
    },
  });
};

export const deleteCategoryLimit = async (deviceId: string, categoryId: string) => {
  await prisma.categoryLimit.delete({
    where: {
      deviceId_categoryId: {
        deviceId,
        categoryId,
      },
    },
  });
};

export interface SyncAppCategoriesInput {
  deviceIdentifier: string;
  appCategories: Array<{ packageName: string; category: string }>;
}

export const syncAppCategories = async (input: SyncAppCategoriesInput) => {
  // Ensure default categories exist
  const defaultCategories = [
    { name: "Games", description: "Applications primarily used for gaming." },
    { name: "Social Media", description: "Applications for social networking and communication." },
    { name: "Entertainment", description: "Video and entertainment applications." },
    { name: "Others", description: "Applications that do not fit into other categories." },
  ];

  const categoryMap = new Map<string, string>();
  
  // Find or create categories
  for (const catData of defaultCategories) {
    let category = await prisma.appCategory.findUnique({
      where: { name: catData.name },
    });
    
    if (!category) {
      category = await prisma.appCategory.create({
        data: {
          name: catData.name,
          description: catData.description,
        },
      });
    }
    
    categoryMap.set(catData.name, category.id);
  }

  let syncedCount = 0;

  // Process each app category mapping
  for (const { packageName, category } of input.appCategories) {
    // Find the app by packageName
    const app = await prisma.app.findFirst({
      where: { packageName },
    });

    if (!app) {
      // App doesn't exist yet, skip it (it will be created when limits are synced)
      continue;
    }

    // Get category ID (default to "Others" if category not found)
    const categoryId = categoryMap.get(category) || categoryMap.get("Others");
    if (!categoryId) continue;

    // Check if app is already in this category
    const existing = await prisma.categoryApp.findUnique({
      where: {
        categoryId_appId: {
          categoryId,
          appId: app.id,
        },
      },
    });

    if (!existing) {
      // Add app to category
      await prisma.categoryApp.create({
        data: {
          categoryId,
          appId: app.id,
        },
      });
      syncedCount++;
    }
  }

  return syncedCount;
};

