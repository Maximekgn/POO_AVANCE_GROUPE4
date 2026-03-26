"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPlatformUser } from "../../lib/adminApi";
import { verifyUser } from "../../lib/adminApi";
import toast from "react-hot-toast";

interface AdminUserDetailClientProps {
  user: AdminPlatformUser;
  accessToken: string;
}

export default function AdminUserDetailClient({
  user,
  accessToken,
}: AdminUserDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleVerifyUser = async () => {
    setLoading(true);
    const result = await verifyUser(user.id, "verify", accessToken);
    setLoading(false);

    if (result.ok) {
      toast.success(result.message || "Utilisateur vérifié.");
      router.refresh();
    } else {
      toast.error(result.message || "Erreur de vérification.");
    }
  };

  const handleRejectDocuments = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de rejeter les documents ? Cela désactivera l'accès jusqu'à ce que de nouveaux documents soient fournis.",
      )
    )
      return;
    setLoading(true);
    const result = await verifyUser(user.id, "reject", accessToken);
    setLoading(false);

    if (result.ok) {
      toast.success(result.message || "Documents rejetés.");
      router.refresh();
    } else {
      toast.error(result.message || "Erreur lors du rejet.");
    }
  };

  const handleSuspendUser = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de suspendre ce compte ? L'utilisateur ne pourra plus se connecter.",
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await verifyUser(user.id, "suspend", accessToken);
    setLoading(false);

    if (result.ok) {
      toast.success(result.message || "Compte suspendu.");
      router.refresh();
    } else {
      toast.error(result.message || "Erreur lors de la suspension.");
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">
        Vérification du compte
      </h2>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleVerifyUser}
          disabled={loading || user.compte_verifie}
          className={`rounded-lg px-4 py-2 font-medium text-white transition ${user.compte_verifie
            ? "bg-black cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
            } disabled:opacity-50`}
        >
          {loading
            ? "Chargement..."
            : user.compte_verifie
              ? "✓ Compte Vérifié"
              : "Approuver le compte"}
        </button>
        <button
          onClick={handleRejectDocuments}
          disabled={
            loading || (!user.documents_complets && !user.compte_verifie)
          }
          className={`rounded-lg px-4 py-2 font-medium text-white transition ${!user.documents_complets && !user.compte_verifie
            ? "bg-black cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-50`}
        >
          {loading ? "Chargement..." : "Refuser les documents"}
        </button>
        <button
          onClick={handleSuspendUser}
          disabled={loading || !user.is_active}
          className={`rounded-lg px-4 py-2 font-medium text-white transition ${!user.is_active
            ? "bg-black cursor-not-allowed"
            : "bg-neutral-800 hover:bg-neutral-900"
            } disabled:opacity-50`}
        >
          {loading ? "Chargement..." : "Suspendre le compte"}
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bg-neutral-50 px-4 py-3 rounded-lg border border-neutral-100">
          <dt className="text-sm font-medium text-neutral-500">
            Statut de vérification
          </dt>
          <dd className="mt-1 text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${user.compte_verifie ? "bg-blue-500" : "bg-amber-500"}`}
            ></span>
            {user.compte_verifie
              ? "Compte approuvé"
              : "En attente d'approbation"}
          </dd>
        </div>
        <div className="bg-neutral-50 px-4 py-3 rounded-lg border border-neutral-100">
          <dt className="text-sm font-medium text-neutral-500">
            Dossier / Documents
          </dt>
          <dd className="mt-1 text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${user.documents_complets ? "bg-blue-500" : "bg-blue-500"}`}
            ></span>
            {user.documents_complets ? "Complets" : "Incomplets / Rejetés"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
