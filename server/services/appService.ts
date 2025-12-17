import { prisma } from "../prisma/client";

export const findOrCreateApp = async (
  packageName: string,
  name?: string
) => {
  const existing = await prisma.app.findUnique({ where: { packageName } });
  if (existing) return existing;

  return prisma.app.create({
    data: {
      packageName,
      name: name ?? packageName,
    },
  });
};

export const listApps = async () => {
  return prisma.app.findMany({
    orderBy: { name: "asc" },
  });
};


