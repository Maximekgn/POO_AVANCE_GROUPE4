"use client";

import { useMemo, useState } from "react";

import {
  type AdminBien,
  refuseBien,
  updateBienActivation,
  validateBien,
} from "../lib/adminApi";

type Props = {
  initialBiens: AdminBien[];
  accessToken: string;
};

export default function BiensTableClient({ initialBiens, accessToken }: Props) {
  const [biens, setBiens] = useState<AdminBien[]>(initialBiens);
  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState<string>("");

  const pendingCount = useMemo(
    () =>
      biens.filter((bien) => bien.statut === "EN_ATTENTE_VALIDATION").length,
    [biens],
  );

  const sortedBiens = useMemo(() => {
    return [...biens].sort((a, b) => {
      if (
        a.statut === "EN_ATTENTE_VALIDATION" &&
        b.statut !== "EN_ATTENTE_VALIDATION"
      ) {
        return -1;
      }
      if (
        b.statut === "EN_ATTENTE_VALIDATION" &&
        a.statut !== "EN_ATTENTE_VALIDATION"
      ) {
        return 1;
      }
      const dateA = a.date_creation ? new Date(a.date_creation).getTime() : 0;
      const dateB = b.date_creation ? new Date(b.date_creation).getTime() : 0;
      return dateB - dateA;
    });
  }, [biens]);

  async function handleValidate(bienId: number) {
    setBusyIds((prev) => ({ ...prev, [bienId]: true }));
    setMessage("");

    const result = await validateBien(bienId, accessToken);
    if (!result.ok) {
      setMessage(result.message || "Validation impossible.");
      setBusyIds((prev) => ({ ...prev, [bienId]: false }));
      return;
    }

    setBiens((prev) =>
      prev.map((bien) =>
        bien.id === bienId ? { ...bien, statut: "VACANT" } : bien,
      ),
    );
    setMessage("Bien valide. Le proprietaire a ete notifie par email.");
    setBusyIds((prev) => ({ ...prev, [bienId]: false }));
  }

  async function handleToggleActivation(bien: AdminBien) {
    setBusyIds((prev) => ({ ...prev, [bien.id]: true }));
    setMessage("");

    const result = await updateBienActivation(
      bien.id,
      !bien.is_active,
      accessToken,
    );
    if (!result.ok) {
      setMessage(result.message || "Mise a jour impossible.");
      setBusyIds((prev) => ({ ...prev, [bien.id]: false }));
      return;
    }

    setBiens((prev) =>
      prev.map((item) =>
        item.id === bien.id ? { ...item, is_active: !item.is_active } : item,
      ),
    );
    setMessage(
      !bien.is_active
        ? "Bien active avec succes."
        : "Bien desactive avec succes.",
    );
    setBusyIds((prev) => ({ ...prev, [bien.id]: false }));
  }

  async function handleRefuse(bienId: number) {
    const motif = window.prompt("Motif du refus (obligatoire):", "");
    if (motif === null) {
      return;
    }

    const motifClean = motif.trim();
    if (!motifClean) {
      setMessage("Le motif de refus est obligatoire.");
      return;
    }

    setBusyIds((prev) => ({ ...prev, [bienId]: true }));
    setMessage("");

    const result = await refuseBien(bienId, motifClean, accessToken);
    if (!result.ok) {
      setMessage(result.message || "Refus impossible.");
      setBusyIds((prev) => ({ ...prev, [bienId]: false }));
      return;
    }

    setMessage("Bien refuse. Le proprietaire a ete notifie par email.");
    setBusyIds((prev) => ({ ...prev, [bienId]: false }));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Nouveaux biens soumis: {pendingCount}</p>
        <p className="mt-1">
          Les biens en attente doivent etre valides par un admin avant
          publication.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
          {message}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Ville</th>
              <th className="px-4 py-3 font-medium">Adresse</th>
              <th className="px-4 py-3 font-medium">Categorie</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Publication</th>
              <th className="px-4 py-3 font-medium">Loyer HC</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedBiens.map((bien) => {
              const isBusy = Boolean(busyIds[bien.id]);
              const canValidate = bien.statut === "EN_ATTENTE_VALIDATION";

              return (
                <tr key={bien.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium text-neutral-800">
                    {bien.reference}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{bien.ville}</td>
                  <td className="px-4 py-3 text-neutral-700">{bien.adresse}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {bien.sous_type_nom || bien.categorie_nom || "-"}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{bien.statut}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {bien.is_active ? "Actif" : "Desactive"}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    FCFA {bien.loyer_hc}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleValidate(bien.id)}
                        disabled={!canValidate || isBusy}
                        className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefuse(bien.id)}
                        disabled={!canValidate || isBusy}
                        className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Refuser
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActivation(bien)}
                        disabled={isBusy}
                        className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {bien.is_active ? "Desactiver" : "Activer"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedBiens.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={8}>
                  Aucun bien disponible pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
