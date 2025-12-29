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

