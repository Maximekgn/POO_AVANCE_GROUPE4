import getCurrentUser from "./getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export type UserFinanceEntry = {
  kind: "DEPENSE" | "REVENU";
  demande_id: number;
  bien_id: number;
  bien_reference?: string;
  type_demande?: string;
  statut?: string;
  montant: number;
  date_debut?: string;
  date_fin?: string;
  date_creation?: string;
};

export type UserFinancePayload = {
  summary: {
    depenses_total: number;
    revenus_total: number;
    nombre_depenses: number;
    nombre_revenus: number;
  };
  history: UserFinanceEntry[];
};

export default async function getUserFinances(): Promise<UserFinancePayload | null> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.accessToken) {
      return null;
    }

    const response = await fetch(`${API_URL}/profile/finances`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentUser.accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const summary = payload.summary || {};
    const history = Array.isArray(payload.history) ? payload.history : [];

    return {
      summary: {
        depenses_total: Number(summary.depenses_total || 0),
        revenus_total: Number(summary.revenus_total || 0),
        nombre_depenses: Number(summary.nombre_depenses || 0),
        nombre_revenus: Number(summary.nombre_revenus || 0),
      },
      history: history.map((entry: any) => ({
        ...entry,
        montant: Number(entry?.montant || 0),
      })),
    };
  } catch {
    return null;
  }
}
