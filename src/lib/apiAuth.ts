import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return { user: null, res: new NextResponse("Unauthorized", { status: 401 }) };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { user: null, res: new NextResponse("Unauthorized", { status: 401 }) };

  return { user, res: null as NextResponse | null };
}
