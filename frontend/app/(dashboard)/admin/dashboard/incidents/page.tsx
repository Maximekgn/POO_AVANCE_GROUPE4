import Link from "next/link";
import { notFound } from "next/navigation";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";
import IncidentsClient from "./IncidentsClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Incident {
  id: number;
  bien: number;
  bien_details?: {
    reference: string;
    adresse: string;
    ville: string;
  };
  locataire: number;
  locataire_nom: string;
  proprietaire: number;
  proprietaire_nom: string;
  assigne_a?: number | null;
  assigne_a_nom?: string | null;
  titre: string;
  description: string;
  categorie: string;
  urgence: string;
  statut: string;
  date_ouverture: string;
  date_fermeture?: string | null;
  resolution_notes?: string | null;
  date_resolution?: string | null;
  cout_estime?: number | null;
  cout_reel?: number | null;
  pris_en_charge?: string | null;
  photos?: Array<{
    id: number;
    photo: string;
    legende: string;
  }>;
  messages_count: number;
  jours_ouverts: number;
  est_urgent: boolean;
  created_at: string;
  updated_at: string;
}

async function getIncidents(token: string): Promise<Incident[]> {
  try {
    const res = await fetch(`${API_URL}/incidents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function AdminIncidentsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(currentUser as any).accessToken) {
    notFound();
  }

  const token = (currentUser as any).accessToken;
  const incidents = await getIncidents(token);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="text-blue-500 hover:underline"
        >
          ← Retour au dashboard
        </Link>
      </div>

      <Heading
        title="🔧 Gestion des Incidents"
        subtitle="Suivez et gérez tous les incidents de maintenance"
      />

      <IncidentsClient initialIncidents={incidents} token={token} apiUrl={API_URL} />
    </div>
  );
}
