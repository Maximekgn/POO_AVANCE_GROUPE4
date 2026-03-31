import { notFound, redirect } from "next/navigation";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import FinaliserBailClient from "./FinaliserBailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface DemandeAction {
  id: number;
  type_demande: "BAIL";
  statut: string;
  bien: number;
  bien_details?: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
    prix_mois?: number | string;
    loyer_hc?: number | string;
    charges?: number | string;
    caution_mois?: number;
    avance_mois?: number;
    frais_assistance?: number | string;
    depot_garantie?: number | string;
  };
  bien_reference: string;
  bien_adresse: string;
  demandeur: number;
  demandeur_nom: string;
  demandeur_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  date_debut?: string | null;
  date_fin?: string | null;
  duree_mois?: number | null;
  paiement_demande_envoyee?: boolean;
  paiement_effectue?: boolean;
  has_lease?: boolean;
  bail_details?: {
    id: number;
    numero_bail: string;
    statut: "BROUILLON" | "EN_ATTENTE_SIGNATURE" | "SIGNE" | "ACTIF";
    date_signature_proprietaire?: string | null;
    date_signature_client?: string | null;
  } | null;
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

export default async function FinaliserBailPage(props: {
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

  return <FinaliserBailClient demande={demande} user={currentUser} />;
}
