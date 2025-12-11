import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return new NextResponse("Missing email or password", { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return new NextResponse("Email already registered", { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
