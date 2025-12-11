import { PrismaClient, User } from "@prisma/client";
import { compare } from "bcryptjs";

export const prisma = new PrismaClient();

export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.hashedPassword) return null;

  const ok = await compare(password, user.hashedPassword);
  if (!ok) return null;

  return user;
}
