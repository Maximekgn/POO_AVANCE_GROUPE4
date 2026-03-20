const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type AdminUser = {
  accessToken?: string;
};

export type AdminBien = {
  id: number;
  reference: string;
  ville: string;
  adresse: string;
  statut: string;
  is_active: boolean;
  loyer_hc: string | number;
  categorie_nom?: string;
  sous_type_nom?: string;
  date_creation?: string;
};

export async function getAdminBiens(
  currentUser: AdminUser,
): Promise<AdminBien[]> {
  const token = currentUser?.accessToken;
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(`${API_URL}/biens`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function getStatusStats(biens: AdminBien[]) {
  const stats = {
    total: biens.length,
    vacant: 0,
    rented: 0,
    pending: 0,
    works: 0,
  };

  biens.forEach((bien) => {
    if (bien.statut === "VACANT") stats.vacant += 1;
    if (bien.statut === "LOUE") stats.rented += 1;
    if (bien.statut === "EN_ATTENTE_VALIDATION") stats.pending += 1;
    if (bien.statut === "EN_TRAVAUX") stats.works += 1;
  });

  return stats;
}

export async function validateBien(
  bienId: number,
  token: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/biens/${bienId}/statut`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ statut: "VACANT" }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        ok: false,
        message:
          payload?.detail || payload?.statut?.[0] || "Validation impossible.",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "Erreur reseau pendant la validation." };
  }
}

export async function updateBienActivation(
  bienId: number,
  isActive: boolean,
  token: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/biens/${bienId}/activation`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        ok: false,
        message:
          payload?.detail ||
          payload?.is_active?.[0] ||
          "Mise a jour impossible.",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "Erreur reseau pendant la mise a jour." };
  }
}

export async function refuseBien(
  bienId: number,
  motifRefus: string,
  token: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/biens/${bienId}/refus`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ motif_refus: motifRefus }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        ok: false,
        message:
          payload?.detail || payload?.motif_refus?.[0] || "Refus impossible.",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "Erreur reseau pendant le refus." };
  }
}
