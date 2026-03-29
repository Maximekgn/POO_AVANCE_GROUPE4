"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import Cookies from "js-cookie";

interface CurrentUser {
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

interface AuthContextType {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    let accessToken = "";

    if (typeof window !== "undefined") {
      accessToken = localStorage.getItem("accessToken") || "";
    }

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
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
      }
      return null;
    }

    const user = await response.json();

    return {
      id: user.id?.toString() || "",
      name:
        user.first_name || user.last_name
          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
          : user.email,
      email: user.email,
      image: user.photo_profil || user.image,
      role: user.is_staff || user.is_superuser ? "ADMIN" : "USER",
      isAdmin: Boolean(user.is_staff || user.is_superuser),
      emailVerified: Boolean(user.email_verified || user.email_verifie),
      documentsCompleted: Boolean(user.documents_complets),
      accessToken,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const user = await fetchCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");
    }
    setCurrentUser(null);
    window.location.assign("/");
  }, []);

  return (
    <AuthContext.Provider
      value={{ currentUser, isLoading, refreshUser, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
