import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // If not logged in, go to auth page
  if (!session || !session.user?.email) {
    redirect("/auth");
  }

  // If logged in, go straight to lofts
  redirect("/lofts");
}
