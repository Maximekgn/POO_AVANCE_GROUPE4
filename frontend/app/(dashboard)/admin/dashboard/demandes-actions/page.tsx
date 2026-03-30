import Link from "next/link";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface DemandeAction {
  id: number;
  type_demande: "VISITE" | "PRIVATISATION" | "LOCATION_DIRECTE" | "BAIL";
  statut: string;
  date_debut?: string | null;
  date_fin?: string | null;
  duree_jours?: number;
  duree_mois?: number | null;
  message?: string;
  bien: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
  };
  demandeur: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  proprietaire: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  date_creation: string;
  date_visite?: string;
}

async function getDemandesActions(
  token: string,
  type?: string,
): Promise<DemandeAction[]> {
  try {
    const url = type
      ? `${API_URL}/demandes-actions?type_demande=${type}`
      : `${API_URL}/demandes-actions`;

    const res = await fetch(url, {
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

export const dynamic = "force-dynamic";

export default async function AdminDemandesActionsPage(props: {
  searchParams: Promise<{ type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentUser = await getCurrentUser();
  const token = currentUser?.accessToken;
  const typeFilter = searchParams.type;

  if (!token) {
    return (
      <div className="p-8">
        <Heading title="Non autorisé" subtitle="Veuillez vous connecter." />
      </div>
    );
  }

  const demandes = await getDemandesActions(token, typeFilter);

  const typeLabels: Record<string, string> = {
    VISITE: "👁️ Visite",
    PRIVATISATION: "🔒 Privatisation",
    LOCATION_DIRECTE: "📋 Location",
    BAIL: "📜 Bail",
  };

  const statutColors: Record<string, string> = {
    EN_ATTENTE: "bg-amber-100 text-amber-800",
    ACCEPTEE: "bg-green-100 text-green-800",
    REFUSEE: "bg-red-100 text-red-800",
    EXPIREE: "bg-gray-100 text-gray-800",
    ANNULEE: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="flex items-center justify-between mb-6">
        <Heading
          title="📬 Demandes d'action"
          subtitle="Visites, privatisations et locations"
        />

        <div className="flex gap-2">
          <Link
            href="/admin/dashboard/demandes-actions"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!typeFilter ? "bg-blue-600 text-white" : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
          >
            Toutes
          </Link>
          <Link
            href="/admin/dashboard/demandes-actions?type=VISITE"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${typeFilter === "VISITE" ? "bg-blue-600 text-white" : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
          >
            👁️ Visites
          </Link>
          <Link
            href="/admin/dashboard/demandes-actions?type=PRIVATISATION"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${typeFilter === "PRIVATISATION" ? "bg-blue-600 text-white" : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
          >
            🔒 Privatisations
          </Link>
          <Link
            href="/admin/dashboard/demandes-actions?type=LOCATION_DIRECTE"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${typeFilter === "LOCATION_DIRECTE" ? "bg-blue-600 text-white" : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
          >
            📋 Locations
          </Link>
          <Link
            href="/admin/dashboard/demandes-actions?type=BAIL"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${typeFilter === "BAIL" ? "bg-blue-600 text-white" : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
          >
            📜 Baux
          </Link>
        </div>
      </div>

      {demandes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">Aucune demande trouvée.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-neutral-600">
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Bien</th>
                <th className="px-4 py-3 font-semibold">Demandeur</th>
                <th className="px-4 py-3 font-semibold">Propriétaire</th>
                <th className="px-4 py-3 font-semibold">Période</th>
                <th className="px-4 py-3 font-semibold">Durée</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((demande) => (
                <tr key={demande.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {typeLabels[demande.type_demande] || demande.type_demande}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    <div className="font-medium">{demande.bien.reference}</div>
                    <div className="text-xs text-neutral-500">
                      {demande.bien.ville}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    <div className="font-medium">
                      {demande.demandeur.first_name}{" "}
                      {demande.demandeur.last_name}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {demande.demandeur.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    <div className="font-medium">
                      {demande.proprietaire.first_name}{" "}
                      {demande.proprietaire.last_name}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {demande.proprietaire.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    <div className="text-xs">
                      {demande.date_debut
                        ? new Date(demande.date_debut).toLocaleDateString(
                            "fr-FR",
                          )
                        : "-"}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {demande.date_fin
                        ? new Date(demande.date_fin).toLocaleDateString("fr-FR")
                        : "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {demande.duree_mois ? (
                      <span className="text-xs font-medium">
                        {demande.duree_mois} mois
                      </span>
                    ) : (
                      <span className="text-xs">
                        {demande.duree_jours || 0} jours
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statutColors[demande.statut] || "bg-gray-100 text-gray-800"}`}
                    >
                      {demande.statut.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/dashboard/demandes-actions/${demande.id}`}
                        className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        Voir
                      </Link>
                      {demande.statut === "EN_ATTENTE" && (
                        <Link
                          href={`/admin/dashboard/demandes-actions/${demande.id}/decision`}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Décider
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
