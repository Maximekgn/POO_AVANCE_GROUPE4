"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AdminBien } from "../../lib/adminApi";
import {
  updateBienActivation,
  validateBien,
  refuseBien,
} from "../../lib/adminApi";

interface AdminBienSidebarProps {
  bien: AdminBien;
  accessToken: string;
}

export default function AdminBienSidebar({
  bien,
  accessToken,
}: AdminBienSidebarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleValidation = async (status: "VACANT" | "REJETE") => {
    if (!confirm(`Confirmer le statut : ${status} ?`)) return;

    setLoading(true);
    let result;
    if (status === "REJETE") {
      const input = prompt("Motif du rejet (obligatoire) :");
      if (!input || input.trim() === "") {
        toast.error("Le motif est obligatoire pour un refus.");
        setLoading(false);
        return;
      }
      result = await refuseBien(bien.id, input.trim(), accessToken);
    } else {
      result = await validateBien(bien.id, accessToken);
    }

    setLoading(false);

    if (result.ok) {
      toast.success(result.message || "Statut mis à jour.");
      router.refresh();
    } else {
      toast.error(result.message || "Erreur lors de la mise à jour.");
    }
  };

  const handleToggleActivation = async () => {
    setLoading(true);
    const result = await updateBienActivation(
      bien.id,
      !bien.is_active,
      accessToken,
    );
    setLoading(false);

    if (result.ok) {
      toast.success(result.message || "Visibilité mise à jour.");
      router.refresh();
    } else {
      toast.error(result.message || "Erreur lors de la mise à jour.");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm sticky top-24">
      <div className="flex flex-col gap-1 pb-4 border-b border-neutral-200 mb-4">
        <h3 className="text-lg font-semibold">Modération</h3>
        <p className="text-sm text-neutral-500">
          Actions d'administration du bien
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Statut Actuel</span>
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${bien.statut === "VACANT"
              ? "bg-green-100 text-green-800"
              : bien.statut === "EN_ATTENTE_VALIDATION"
                ? "bg-amber-100 text-amber-800"
                : bien.statut === "REJETE"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
          >
            {bien.statut}
          </span>
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <span className="text-sm font-medium">Visibilité</span>
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${bien.is_active
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
              }`}
          >
            {bien.is_active ? "En ligne" : "Masqué"}
          </span>
        </div>

        {bien.statut === "EN_ATTENTE_VALIDATION" && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => handleValidation("VACANT")}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              Approuver
            </button>
            <button
              onClick={() => handleValidation("REJETE")}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              Rejeter
            </button>
          </div>
        )}

        {bien.statut === "VACANT" && (
          <button
            onClick={() => handleValidation("EN_ATTENTE_VALIDATION" as any)}
            disabled={loading}
            className="bg-amber-100 text-amber-800 hover:bg-amber-200 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 w-full mt-2"
          >
            Remettre en attente
          </button>
        )}

        <button
          onClick={handleToggleActivation}
          disabled={loading}
          className={`flex items-center justify-center gap-2 py-2 w-full rounded-lg text-sm font-semibold transition mt-2 ${bien.is_active
            ? "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
            : "bg-blue-500 text-white hover:bg-blue-700"
            } disabled:opacity-50`}
        >
          {bien.is_active ? "Désactiver l'annonce" : "Activer l'annonce"}
        </button>
      </div>
    </div>
  );
}
