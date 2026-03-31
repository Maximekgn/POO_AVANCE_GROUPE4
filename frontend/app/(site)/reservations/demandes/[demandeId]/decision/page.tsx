import { notFound, redirect } from "next/navigation";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import DecisionDemandeClient from "./DecisionDemandeClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface DemandeAction {
  id: number;
  type_demande: "VISITE" | "PRIVATISATION" | "LOCATION_DIRECTE" | "BAIL";
  statut: string;
  bien_reference: string;
  bien_adresse: string;
  bien_details?: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
  };
  demandeur: number;
  demandeur_nom: string;
  demandeur_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  proprietaire: number;
  date_debut?: string | null;
  date_fin?: string | null;
  duree_mois?: number | null;
  note_demandeur?: string | null;
  message?: string | null;
}

async function getDemandeActionById(
  demandeId: number,
  token: string,
): Promise<DemandeAction | null> {
  try {
    const res = await fetch(`${API_URL}/demandes-actions/${demandeId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function DecisionDemandePage(props: {
  params: Promise<{ demandeId: string }>;
}) {
  const params = await props.params;
  const currentUser = await getCurrentUser();

  if (!currentUser?.accessToken) {
    redirect("/login");
  }

  const demande = await getDemandeActionById(
    parseInt(params.demandeId, 10),
    currentUser.accessToken,
  );
  if (!demande) {
    notFound();
  }

  // Vérifier que c'est le propriétaire
  if (currentUser.id !== demande.proprietaire.toString()) {
    redirect("/reservations");
  }

  return <DecisionDemandeClient demande={demande} user={currentUser} />;
}
