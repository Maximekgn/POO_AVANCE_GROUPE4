import { cookies } from "next/headers";

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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return null;
    }

    const response = await fetch(`${API_URL}/profile/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();

    // Déterminer si l'utilisateur est admin
    // Le backend peut retourner soit 'role', soit 'is_staff'/'is_superuser'
    const isAdmin =
      user.role === "ADMIN" || Boolean(user.is_staff || user.is_superuser);

    return {
      id: user.id?.toString() || "",
      name:
        user.first_name || user.last_name
          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
          : user.email,
      email: user.email,
      image: user.photo_profil || user.image,
      role: user.role || (isAdmin ? "ADMIN" : "USER"),
      isAdmin,
      emailVerified: Boolean(user.email_verified || user.email_verifie),
      documentsCompleted: Boolean(user.documents_complets),
      accessToken,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
