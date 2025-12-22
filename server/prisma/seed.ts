import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "./client";

dotenv.config();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Admin";

  if (!email || !password) {
    console.log(
      "[SEED] Skipped: ADMIN_EMAIL and ADMIN_PASSWORD must be set to create an initial admin user."
    );
    return;
  }

  console.log(`[SEED] Starting admin user creation for: ${email}`);

  try {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash, role: "ADMIN" },
      create: { email, name, passwordHash, role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    console.log("[SEED] Admin user ready:", { id: user.id, email: user.email, role: user.role });
  } catch (error) {
    console.error("[SEED] Failed to create admin user:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

