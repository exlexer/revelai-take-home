import { PrismaClient } from "../generated/prisma";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
});

export const connectDatabases = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL via Prisma");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

export const closeDatabases = async () => {
  await prisma.$disconnect();
};
