const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type AdminUser = {
  accessToken?: string;
};

export type AdminBien = {
  id: number;
  proprietaire_info?: number | null;
  proprietaire_nom?: string | null;
  proprietaire_email?: string | null;
  proprietaire_telephone?: string | null;
  proprietaire_avatar?: string | null;
  reference: string;
  categorie?: number | null;
  ville: string;
  quartier?: string;
  adresse: string;
  code_postal?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  description?: string | null;
  superficie?: string | number;
  nb_pieces?: number;
  etage?: number | null;
  meuble?: boolean;
  prix_jour?: string | number;
  prix_mois?: string | number;
  statut: string;
  is_active: boolean;
  loyer_hc: string | number;
  charges?: string | number;
  depot_garantie?: string | number;
  categorie_nom?: string;
  sous_type?: number | null;
  sous_type_nom?: string;
  date_creation?: string;
  date_modification?: string;
  photos?: Array<{
    id: number;
    url?: string | null;
    image?: string | null;
    description?: string | null;
    principale?: boolean;
    ordre?: number;
    date_upload?: string;
  }>;
};

export type AdminDocument = {
  id: number;
  nom: string;
  type: string;
  url?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  taille_octets?: number | null;
  date_generation?: string;
};

export type AdminClientInfo = {
  profession?: string | null;
  numero_piece?: string | null;
  revenus_mensuels?: string | number | null;
  date_creation?: string;
  carte_identite?: AdminDocument | null;
};

export type AdminProprietaireInfo = {
  iban?: string | null;
  adresse_fiscale?: string | null;
  numero_piece?: string | null;
  date_creation?: string;
  carte_identite?: AdminDocument | null;
};

export type AdminPlatformUser = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  telephone?: string | null;
  photo_profil?: string | null;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_admin: boolean;
  role: string;
  compte_verifie: boolean;
  email_verifie: boolean;
  documents_complets: boolean;
  last_login?: string | null;
  date_joined?: string;
  date_creation?: string | null;
  dernier_login_custom?: string | null;
  client_info?: AdminClientInfo | null;
  proprietaire_info?: AdminProprietaireInfo | null;
  nombre_biens: number;
  resume_immobilier?: {
    is_client: boolean;
    is_proprietaire: boolean;
    biens_possedes_count: number;
    biens_loues_ou_privatises_count: number;
  };
};

export type AdminUserRentedBien = {
  bail_id: number;
  numero_bail: string;
  bail_statut: string;
  date_entree?: string | null;
  date_sortie?: string | null;
  loyer_actuel: string | number;
  depot_garantie?: string | number;
  bien: {
    id: number;
    reference: string;
    ville: string;
    quartier?: string;
    adresse: string;
    statut: string;
    is_active: boolean;
    prix_jour?: string | number;
    prix_mois?: string | number;
  };
};

export type AdminFinanceStats = {
  loyers_attendus: number;
  loyers_payes: number;
  en_attente: number;
  impayes: number;
  total_depenses: number;
  taux_recouvrement: number;
  nombre_paiements: number;
  nombre_depenses: number;
};

export type AdminPayment = {
  id: number;
  reference: string;
  montant: number;
  date_echeance: string;
  date_paiement?: string | null;
  statut: string;
  mode_paiement?: string | null;
  commentaire?: string | null;
  bien_id?: number | null;
  bien_reference?: string | null;
  locataire_id?: number | null;
  locataire_nom?: string | null;
  locataire_email?: string | null;
};

export type AdminExpense = {
  id: number;
  categorie: string;
  libelle: string;
  montant: number;
  date_depense: string;
  fournisseur?: string | null;
  numero_facture?: string | null;
  bien_id?: number | null;
  bien_reference?: string | null;
  proprietaire_id?: number | null;
  proprietaire_nom?: string | null;
  proprietaire_email?: string | null;
};

export type AdminFinanceProfile = {
  user: {
    id: number;
    email: string;
    full_name: string;
  };
  totals: {
    locataire_total_paye: number;
    locataire_total_du: number;
    locataire_loyers_a_payer?: number;
    locataire_loyers_impayes?: number;
    proprietaire_loyers_percus?: number;
    proprietaire_loyers_impayes?: number;
    proprietaire_total_depenses: number;
  };
  paiements_locataire: AdminPayment[];
  depenses_proprietaire: AdminExpense[];
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

export async function getAdminUsers(
  currentUser: AdminUser,
): Promise<AdminPlatformUser[]> {
  const token = currentUser?.accessToken;
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(`${API_URL}/admin/users`, {
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
    return Array.isArray(data) ? (data as AdminPlatformUser[]) : [];
  } catch {
    return [];
  }
}

export async function getAdminFinanceStats(
  currentUser: AdminUser,
): Promise<AdminFinanceStats | null> {
  const token = currentUser?.accessToken;
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/admin/finances/stats`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as AdminFinanceStats;
  } catch {
    return null;
  }
}

export async function getAdminPayments(
  currentUser: AdminUser,
): Promise<AdminPayment[]> {
  const token = currentUser?.accessToken;
  if (!token) return [];

  try {
    const response = await fetch(`${API_URL}/admin/finances/paiements`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? (data as AdminPayment[]) : [];
  } catch {
    return [];
  }
}

export async function getAdminPaymentById(
  paymentId: number,
  currentUser: AdminUser,
): Promise<AdminPayment | null> {
  const token = currentUser?.accessToken;
  if (!token) return null;

  try {
    const response = await fetch(
      `${API_URL}/admin/finances/paiements/${paymentId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as AdminPayment;
  } catch {
    return null;
  }
}

export async function getAdminExpenses(
  currentUser: AdminUser,
): Promise<AdminExpense[]> {
  const token = currentUser?.accessToken;
  if (!token) return [];

  try {
    const response = await fetch(`${API_URL}/admin/finances/depenses`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? (data as AdminExpense[]) : [];
  } catch {
    return [];
  }
}

export async function getAdminExpenseById(
  expenseId: number,
  currentUser: AdminUser,
): Promise<AdminExpense | null> {
  const token = currentUser?.accessToken;
  if (!token) return null;

  try {
    const response = await fetch(
      `${API_URL}/admin/finances/depenses/${expenseId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as AdminExpense;
  } catch {
    return null;
  }
}

export async function getAdminFinanceProfile(
  userId: number,
  currentUser: AdminUser,
): Promise<AdminFinanceProfile | null> {
  const token = currentUser?.accessToken;
  if (!token) return null;

  try {
    const response = await fetch(
      `${API_URL}/admin/finances/profils/${userId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as AdminFinanceProfile;
  } catch {
    return null;
  }
}

export async function verifyUser(
  userId: number,
  action: "verify" | "reject" | "suspend",
  token: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/admin/users/${userId}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      if (payload?.error || payload?.message) {
        return {
          ok: false,
          message: payload.error || payload.message,
        };
      }
      return { ok: false, message: "Erreur lors de la vérification." };
    }

    const data = await response.json();
    return { ok: true, message: data.message };
  } catch {
    return { ok: false, message: "Erreur réseau." };
  }
}

export async function getAdminBienById(
  bienId: number,
  currentUser: AdminUser,
): Promise<AdminBien | null> {
  const token = currentUser?.accessToken;
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/biens/${bienId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      return data as AdminBien;
    }

    // Fallback: keep detail page usable when detail endpoint is unavailable.
    const listResponse = await fetch(`${API_URL}/biens`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!listResponse.ok) {
      return null;
    }
    const listData = await listResponse.json();
    if (!Array.isArray(listData)) {
      return null;
    }
    const matched = listData.find((item) => Number(item?.id) === bienId);
    return (matched || null) as AdminBien | null;
  } catch {
    return null;
  }
}

export async function getAdminUserById(
  userId: number,
  currentUser: AdminUser,
): Promise<AdminPlatformUser | null> {
  const token = currentUser?.accessToken;
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      return data as AdminPlatformUser;
    }

    // Fallback: use users list if detail endpoint fails.
    const listResponse = await fetch(`${API_URL}/admin/users`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!listResponse.ok) {
      return null;
    }
    const listData = await listResponse.json();
    if (!Array.isArray(listData)) {
      return null;
    }
    const matched = listData.find((item) => Number(item?.id) === userId);
    return (matched || null) as AdminPlatformUser | null;
  } catch {
    return null;
  }
}

export async function getAdminUserBiens(
  userId: number,
  currentUser: AdminUser,
): Promise<AdminBien[]> {
  const token = currentUser?.accessToken;
  if (!token) return [];

  try {
    const response = await fetch(`${API_URL}/admin/users/${userId}/biens`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? (data as AdminBien[]) : [];
  } catch {
    return [];
  }
}

export async function getAdminUserRentedBiens(
  userId: number,
  currentUser: AdminUser,
): Promise<AdminUserRentedBien[]> {
  const token = currentUser?.accessToken;
  if (!token) return [];

  try {
    const response = await fetch(
      `${API_URL}/admin/users/${userId}/biens-loues`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? (data as AdminUserRentedBien[]) : [];
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
