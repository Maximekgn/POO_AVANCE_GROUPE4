import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function getSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export default async function getCurrentUser() {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return null;
    }

    // Return user info from session since we don't use Prisma anymore
    // and Django is the source of truth.
    return {
      ...session.user,
      role: (session as any).role || "CLIENT",
      accessToken: (session as any).accessToken,
    };
  } catch (error: any) {
    return null;
  }
}

