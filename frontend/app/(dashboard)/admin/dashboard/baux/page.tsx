import Link from "next/link";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";
import {
  FileText,
  Home,
  User,
  Building,
  Calendar,
  DollarSign,
  Eye,
  Search,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Bail {
  id: number;
  numero_bail: string;
  bien: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
  };
  client_info: {
    id: number;
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  proprietaire_info?: {
    id: number;
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
  } | null;
  date_entree: string;
  date_sortie: string;
  loyer_actuel: number;
  depot_garantie: number;
  statut: string;
  date_creation: string;
}

async function getBaux(token: string): Promise<Bail[]> {
  try {
    const res = await fetch(`${API_URL}/baux`, {
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

export default async function AdminBauxPage() {
  const currentUser = await getCurrentUser();
  const token = currentUser?.accessToken;

  if (!token) {
    return (
      <div className="p-8">
        <Heading title="Non autorisé" subtitle="Veuillez vous connecter." />
      </div>
    );
  }

  const baux = await getBaux(token);

  const statutColors: Record<string, string> = {
    EN_COURS: "bg-green-100 text-green-800 border-green-200",
    EN_ATTENTE_SIGNATURE: "bg-amber-100 text-amber-800 border-amber-200",
    TERMINE: "bg-blue-100 text-blue-800 border-blue-200",
    RESILIE: "bg-red-100 text-red-800 border-red-200",
    BROUILLON: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const statutIcons: Record<string, any> = {
    EN_COURS: FileText,
    EN_ATTENTE_SIGNATURE: Calendar,
    TERMINE: FileText,
    RESILIE: FileText,
    BROUILLON: FileText,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading
            title="Gestion des baux"
            subtitle="Liste de tous les baux de la plateforme"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <FileText className="w-4 h-4" />
          <span>
            {baux.length} bail{baux.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {baux.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <FileText className="w-16 h-16 text-neutral-300 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">
              Aucun bail trouvé
            </h3>
            <p className="text-neutral-500 text-sm mb-4">
              Les baux seront automatiquement créés après la confirmation des
              paiements.
            </p>
            <Link
              href="/admin/dashboard/demandes-actions"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition"
            >
              <FileText className="w-4 h-4" />
              Voir les demandes
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr className="text-left text-neutral-600">
                <th className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Référence
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Bien
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Locataire
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Propriétaire
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date entrée
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Loyer
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {baux.map((bail) => {
                const StatusIcon = statutIcons[bail.statut] || FileText;
                return (
                  <tr
                    key={bail.id}
                    className="border-t border-neutral-100 hover:bg-neutral-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-800">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-neutral-400" />
                        {bail.numero_bail || `#${bail.id}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      <div className="flex items-center gap-2">
                        <Home className="w-3 h-3 text-neutral-400" />
                        <div>
                          <div className="font-medium">
                            {bail.bien?.reference || "N/A"}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {bail.bien?.ville || ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-neutral-400" />
                        <div>
                          <div className="font-medium">
                            {bail.client_info?.utilisateur.first_name}{" "}
                            {bail.client_info?.utilisateur.last_name}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {bail.client_info?.utilisateur.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      <div className="flex items-center gap-2">
                        <Building className="w-3 h-3 text-neutral-400" />
                        <div>
                          <div className="font-medium">
                            {bail.proprietaire_info?.utilisateur.first_name}{" "}
                            {bail.proprietaire_info?.utilisateur.last_name}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {bail.proprietaire_info?.utilisateur.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        {new Date(bail.date_entree).toLocaleDateString("fr-FR")}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-800">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-neutral-400" />
                        {bail.loyer_actuel.toLocaleString("fr-FR")} FCFA
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statutColors[bail.statut] || "bg-gray-100 text-gray-800 border-gray-200"}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {bail.statut.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/dashboard/baux/${bail.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        <Eye className="w-3 h-3" />
                        Voir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
