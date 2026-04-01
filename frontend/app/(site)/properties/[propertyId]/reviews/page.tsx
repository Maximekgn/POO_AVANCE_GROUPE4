import Link from "next/link";
import { notFound } from "next/navigation";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";
import ReviewsClient from "./ReviewsClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Property {
  id: number;
  reference: string;
  adresse: string;
  ville: string;
  description?: string;
  loyer_hc?: number;
  prix_mois?: number;
  statut?: string;
  is_active?: boolean;
  photos?: Array<{
    url?: string;
    image?: string;
  }>;
}

interface Review {
  id: number;
  bail: number;
  bail_reference: string;
  auteur: number;
  auteur_nom: string;
  auteur_avatar?: string;
  cible_type: string;
  cible_id: number;
  note_globale: number;
  note_proprete?: number;
  note_exactitude?: number;
  note_communication?: number;
  note_emplacement?: number;
  note_enregistrement?: number;
  moyenne_details?: number;
  commentaire: string;
  points_positifs?: string;
  points_negatifs?: string;
  est_visible: boolean;
  date_creation: string;
  reponse?: string;
  reponse_visible?: boolean;
  date_reponse?: string;
}

async function getPropertyById(id: number, token: string): Promise<Property | null> {
  try {
    const res = await fetch(`${API_URL}/biens/${id}`, {
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

async function getPropertyReviews(id: number): Promise<Review[]> {
  try {
    const res = await fetch(`${API_URL}/reviews/par-cible?cible_type=LOCATAIRE_BIEN&cible_id=${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.reviews || [];
  } catch {
    return [];
  }
}

export default async function PropertyReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const propertyId = parseInt(resolvedParams.id, 10);
  
  if (Number.isNaN(propertyId) || propertyId <= 0) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const token = (currentUser as any)?.accessToken || "";

  const [property, reviews] = await Promise.all([
    getPropertyById(propertyId, token),
    getPropertyReviews(propertyId),
  ]);

  if (!property) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/properties"
          className="text-blue-500 hover:underline"
        >
          ← Retour aux propriétés
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-100">
          {property.photos?.[0]?.url || property.photos?.[0]?.image ? (
            <img
              src={property.photos[0].url || property.photos[0].image}
              alt={property.reference}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400">
              🏠
            </div>
          )}
        </div>
        <div>
          <Heading
            title={`${property.reference} - Avis`}
            subtitle={`${property.adresse}, ${property.ville}`}
          />
        </div>
      </div>

      <ReviewsClient property={property} reviews={reviews} token={token} apiUrl={API_URL} />
    </div>
  );
}
