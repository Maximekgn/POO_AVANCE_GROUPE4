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

    const sessionUser = session.user as any;
    // Prefer numeric ID from session if available (from our NextAuth fix)
    let userId = sessionUser.id;

    // If ID is missing or is the email, fallback carefully
    if (!userId || userId === session.user.email) {
      userId = sessionUser.user_id || sessionUser.id || session.user.email;
    }

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
