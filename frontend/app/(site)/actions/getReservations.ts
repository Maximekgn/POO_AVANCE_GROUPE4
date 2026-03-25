import getCurrentUser from "./getCurrentUser";

interface Reservation {
  listingId?: string;
  userId?: string;
  authorId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type DemandeActionItem = {
  id: number;
  bien: number;
  bien_reference?: string;
  bien_adresse?: string;
  type_demande?: string;
  statut?: string;
  date_debut?: string;
  date_fin?: string;
  montant_total?: number | string;
};

export default async function getReservations(params: Reservation) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.accessToken) {
      return [];
    }

    const isIncomingScope = Boolean(params.authorId);
    const endpoint = isIncomingScope
      ? `${API_URL}/demandes-actions/recues`
      : `${API_URL}/demandes-actions`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentUser.accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const demandes: DemandeActionItem[] = await response.json();
    if (!Array.isArray(demandes)) {
      return [];
    }

    return demandes
      .filter((item) => item.statut !== "REFUSEE" && item.statut !== "ANNULEE")
      .map((item) => ({
        id: String(item.id),
        status: item.statut,
        totalPrice: Number(item.montant_total || 0),
        startDate: item.date_debut,
        endDate: item.date_fin,
        listing: {
          id: String(item.bien),
          imageSrc: "/placeholder-image.jpg",
          locationValue: item.bien_adresse || "",
          ville: item.bien_adresse || "",
          category: item.type_demande || "Reservation",
          price: Number(item.montant_total || 0),
          priceMonthly: Number(item.montant_total || 0),
        },
      }));
  } catch (error: any) {
    throw new Error(
      error?.message || "Impossible de recuperer les reservations.",
    );
  }
}
