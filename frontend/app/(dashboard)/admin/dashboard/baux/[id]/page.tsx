import Link from "next/link";
import { notFound } from "next/navigation";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";
import RelanceSignatureButton from "./RelanceSignatureButton";
import EnvoiBailButton from "./EnvoiBailButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface BailDetail {
  id: number;
  numero_bail: string;
  bien: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
    superficie?: number;
    nb_pieces?: number;
  };
  client_info: {
    id: number;
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      telephone?: string;
    };
  };
  proprietaire_info?: {
    id: number;
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      telephone?: string;
    };
  } | null;
  date_entree: string;
  date_sortie: string;
  loyer_actuel: number;
  depot_garantie: number;
  statut: string;
  date_creation: string;
  signatures?: Array<{
    id: number;
    type_signataire: string;
    utilisateur_id: number;
    image_signature_url?: string;
    date_signature?: string;
  }>;
}

async function getBailDetail(
  id: number,
  token: string,
): Promise<BailDetail | null> {
  try {
    const res = await fetch(`${API_URL}/baux/${id}`, {
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

export const dynamic = "force-dynamic";

export default async function AdminBailDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const currentUser = await getCurrentUser();
  const token = currentUser?.accessToken;

  if (!token) {
    return (
      <div className="p-8">
        <Heading title="Non autorisé" subtitle="Veuillez vous connecter." />
      </div>
    );
  }

  const bail = await getBailDetail(parseInt(params.id), token);

  if (!bail) {
    notFound();
  }

  const statutColors: Record<string, string> = {
    EN_COURS: "bg-green-100 text-green-800",
    EN_ATTENTE_SIGNATURE: "bg-amber-100 text-amber-800",
    TERMINE: "bg-blue-100 text-blue-800",
    RESILIE: "bg-red-100 text-red-800",
    BROUILLON: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="p-8  mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>

      <Heading
        title={`📋 Bail ${bail.numero_bail || `#${bail.id}`}`}
        subtitle="Détails du contrat de bail"
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informations bail */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Informations du bail</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-neutral-500">Statut</span>
              <div className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statutColors[bail.statut] || "bg-gray-100 text-gray-800"}`}
                >
                  {bail.statut.replace("_", " ")}
                </span>
              </div>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Date d'entrée</span>
              <p className="font-medium">
                {new Date(bail.date_entree).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Date de sortie</span>
              <p className="font-medium">
                {new Date(bail.date_sortie).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Loyer mensuel</span>
              <p className="font-medium text-lg">
                {bail.loyer_actuel.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">
                Dépôt de garantie
              </span>
              <p className="font-medium">
                {bail.depot_garantie.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          </div>
        </div>

        {/* Informations bien */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Bien loué</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-neutral-500">Référence</span>
              <p className="font-medium">{bail.bien?.reference || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Ville</span>
              <p className="font-medium">{bail.bien?.ville || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Adresse</span>
              <p className="font-medium">{bail.bien?.adresse || "N/A"}</p>
            </div>
            {bail.bien?.superficie && (
              <div>
                <span className="text-sm text-neutral-500">Superficie</span>
                <p className="font-medium">{bail.bien.superficie} m²</p>
              </div>
            )}
            <div className="pt-2">
              <Link
                href={`/admin/dashboard/biens/${bail.bien?.id}`}
                className="inline-flex rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Voir le bien
              </Link>
            </div>
          </div>
        </div>

        {/* Locataire */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">👤 Locataire</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-neutral-500">Nom complet</span>
              <p className="font-medium">
                {bail.client_info?.utilisateur?.first_name || "N/A"}{" "}
                {bail.client_info?.utilisateur?.last_name || ""}
              </p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Email</span>
              <p className="font-medium">
                {bail.client_info?.utilisateur?.email || "N/A"}
              </p>
            </div>
            {bail.client_info?.utilisateur?.telephone && (
              <div>
                <span className="text-sm text-neutral-500">Téléphone</span>
                <p className="font-medium">
                  {bail.client_info.utilisateur.telephone}
                </p>
              </div>
            )}
            <div className="pt-2">
              <Link
                href={`/admin/dashboard/finances/profils/${bail.client_info?.id}`}
                className="inline-flex rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Profil financier
              </Link>
            </div>
          </div>
        </div>

        {/* Propriétaire */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">🏠 Propriétaire</h3>
          {bail.proprietaire_info?.utilisateur ? (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-neutral-500">Nom complet</span>
                <p className="font-medium">
                  {bail.proprietaire_info.utilisateur.first_name}{" "}
                  {bail.proprietaire_info.utilisateur.last_name}
                </p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Email</span>
                <p className="font-medium">
                  {bail.proprietaire_info.utilisateur.email}
                </p>
              </div>
              {bail.proprietaire_info.utilisateur.telephone && (
                <div>
                  <span className="text-sm text-neutral-500">Téléphone</span>
                  <p className="font-medium">
                    {bail.proprietaire_info.utilisateur.telephone}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-neutral-500">Propriétaire non disponible</p>
          )}
        </div>
      </div>

      {/* Signatures */}
      {bail.signatures && bail.signatures.length > 0 && (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">✍️ Signatures</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bail.signatures.map((sig) => (
              <div
                key={sig.id}
                className="rounded-xl border border-neutral-200 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">
                    {sig.type_signataire === "PROPRIETAIRE"
                      ? "🏠 Propriétaire"
                      : "👤 Locataire"}
                  </span>
                  {sig.date_signature && (
                    <span className="text-xs text-neutral-500">
                      {new Date(sig.date_signature).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
                {sig.image_signature_url ? (
                  <div className="h-20 bg-neutral-50 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-neutral-500">
                      Signature disponible
                    </span>
                  </div>
                ) : (
                  <div className="h-20 bg-neutral-50 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-neutral-400">
                      En attente de signature
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <Link
          href="/admin/dashboard/baux"
          className="rounded-xl border border-neutral-300 px-4 py-2 font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Retour à la liste
        </Link>
        {bail.statut === "EN_ATTENTE_SIGNATURE" && (
          <>
            <Link
              href={`/admin/dashboard/baux/${bail.id}/signer`}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ✍️ Signer le bail
            </Link>
            {currentUser?.accessToken && (
              <RelanceSignatureButton
                bailId={bail.id}
                token={currentUser.accessToken}
                apiUrl={API_URL}
              />
            )}
          </>
        )}
        {(bail.statut === "EN_COURS" || bail.signatures?.length > 0) &&
          currentUser?.accessToken && (
            <EnvoiBailButton
              bailId={bail.id}
              token={currentUser.accessToken}
              apiUrl={API_URL}
            />
          )}
      </div>
    </div>
  );
}
