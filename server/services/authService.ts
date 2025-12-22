import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../prisma/client";

const JWT_SECRET = (() => {
  const value = process.env.JWT_SECRET;
  if (!value || value.trim() === "") {
    throw new Error("JWT_SECRET is not set");
  }
  return value;
})();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: {
  id: string;
  email: string;
  role: Role;
}) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
};

export const validateUserCredentials = async (
  email: string,
  password: string
) => {
  // Normalize email to lowercase (consistent with user creation).
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[AUTH] User not found for email: ${normalizedEmail}`);
    }
    return null;
  }

  const match = await verifyPassword(password, user.passwordHash);
  if (!match) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[AUTH] Password mismatch for user: ${user.email}`);
    }
    return null;
  }

  return user;
};


