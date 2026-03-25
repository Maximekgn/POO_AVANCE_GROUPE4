"use server";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type ProfileUpdatePayload = {
  first_name?: string;
  last_name?: string;
  telephone?: string;
  photo_profil?: string;
  profession?: string;
  revenus_mensuels?: string;
  numero_piece_client?: string;
  iban?: string;
  adresse_fiscale?: string;
  numero_piece_proprietaire?: string;
};

async function getAccessToken() {
  const currentUser = await getCurrentUser();
  return currentUser?.accessToken || null;
}

export async function getMyProfile() {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/profile/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function updateMyProfile(payload: ProfileUpdatePayload) {
  const token = await getAccessToken();
  if (!token) {
    return { error: "Session invalide." };
  }

  try {
    const response = await fetch(`${API_URL}/profile/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        error:
          result?.detail ||
          result?.message ||
          "Impossible de mettre à jour votre profil.",
      };
    }

    return { success: true, data: result };
  } catch {
    return { error: "Erreur serveur pendant la mise à jour du profil." };
  }
}

export async function uploadMyIdentityDocument(formData: FormData) {
  const token = await getAccessToken();
  if (!token) {
    return { error: "Session invalide." };
  }

  try {
    const response = await fetch(`${API_URL}/auth/upload-documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        error:
          result?.detail ||
          result?.message ||
          "Impossible d'enregistrer vos documents.",
      };
    }

    return { success: true, data: result };
  } catch {
    return { error: "Erreur serveur pendant l'upload du document." };
  }
}
