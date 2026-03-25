import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export interface CurrentUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  isAdmin: boolean;
  emailVerified: boolean;
  documentsCompleted: boolean;
  accessToken?: string;
  favoriteIds: string[];
}

export async function getSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export default async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return null;
    }

    // Return user info from session since we don't use Prisma anymore
    // and Django is the source of truth.
    const userId =
      typeof (session.user as any).id === "string" && (session.user as any).id
        ? (session.user as any).id
        : session.user.email;

    return {
      ...session.user,
      id: userId,
      role: (session as any).role || "USER",
      isAdmin: Boolean((session as any).isAdmin),
      emailVerified: Boolean((session as any).emailVerified),
      documentsCompleted: Boolean((session as any).documentsCompleted),
      accessToken: (session as any).accessToken,
      favoriteIds: Array.isArray((session as any).favoriteIds)
        ? (session as any).favoriteIds
        : [],
    };
  } catch (error: any) {
    return null;
  }
}
