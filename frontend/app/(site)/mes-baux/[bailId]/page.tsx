import { notFound } from "next/navigation";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import BailDetailClient from "./BailDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface BailDetail {
  id: number;
  numero_bail: string;
  statut: "BROUILLON" | "EN_ATTENTE_SIGNATURE" | "SIGNE" | "ACTIF" | "TERMINE";
  date_entree: string;
  date_sortie: string;
  date_signature_proprietaire?: string | null;
  date_signature_client?: string | null;
  loyer_actuel: number;
  depot_garantie: number;
  bien: {
    id: number;
    reference: string;
    adresse: string;
    ville: string;
    loyer_hc?: number;
    charges?: number;
  };
  client_info?: {
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      telephone?: string;
    };
  };
  proprietaire_info?: {
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      telephone?: string;
    };
  };
  signatures?: Array<{
    id: number;
    type_signataire: "PROPRIETAIRE" | "LOCATAIRE";
    signe_le?: string | null;
    signature_ip?: string;
  }>;
}

async function getBailById(bailId: number, token: string): Promise<BailDetail | null> {
  try {
    const res = await fetch(`${API_URL}/baux/${bailId}`, {
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

export default async function BailDetailPage(props: {
  params: Promise<{ bailId: string }>;
}) {
  const params = await props.params;
  const currentUser = await getCurrentUser();

  if (!currentUser?.accessToken) {
    notFound();
  }

  const bail = await getBailById(parseInt(params.bailId, 10), currentUser.accessToken);
  if (!bail) {
    notFound();
  }

  return <BailDetailClient bail={bail} user={currentUser} />;
}
