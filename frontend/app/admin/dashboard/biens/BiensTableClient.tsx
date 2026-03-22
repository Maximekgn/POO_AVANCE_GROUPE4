"use client";

import Link from "next/link";
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
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [publicationFilter, setPublicationFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [refuseModalBienId, setRefuseModalBienId] = useState<number | null>(
    null,
  );
  const [motifRefusDraft, setMotifRefusDraft] = useState<string>("");
  const [motifError, setMotifError] = useState<string>("");

  const pendingCount = useMemo(
    () =>
      biens.filter((bien) => bien.statut === "EN_ATTENTE_VALIDATION").length,
    [biens],
  );

  const filteredBiens = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = biens.filter((bien) => {
      if (statusFilter !== "ALL" && bien.statut !== statusFilter) {
        return false;
      }

      if (publicationFilter === "ACTIVE" && !bien.is_active) {
        return false;
      }
      if (publicationFilter === "INACTIVE" && bien.is_active) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const text = [
        bien.reference,
        bien.ville,
        bien.adresse,
        bien.quartier || "",
        bien.categorie_nom || "",
        bien.sous_type_nom || "",
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(normalized);
    });

    return [...filtered].sort((a, b) => {
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
  }, [biens, query, statusFilter, publicationFilter]);

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

  function openRefuseModal(bienId: number) {
    setRefuseModalBienId(bienId);
    setMotifRefusDraft("");
    setMotifError("");
  }

  function closeRefuseModal() {
    setRefuseModalBienId(null);
    setMotifRefusDraft("");
    setMotifError("");
  }

  async function handleConfirmRefuse() {
    if (!refuseModalBienId) {
      return;
    }

    const motifClean = motifRefusDraft.trim();
    if (!motifClean) {
      setMotifError("Le motif de refus est obligatoire.");
      return;
    }

    setBusyIds((prev) => ({ ...prev, [refuseModalBienId]: true }));
    setMessage("");
    setMotifError("");

    const result = await refuseBien(refuseModalBienId, motifClean, accessToken);
    if (!result.ok) {
      setMessage(result.message || "Refus impossible.");
      setBusyIds((prev) => ({ ...prev, [refuseModalBienId]: false }));
      return;
    }

    setMessage("Bien refuse. Le proprietaire a ete notifie par email.");
    setBusyIds((prev) => ({ ...prev, [refuseModalBienId]: false }));
    closeRefuseModal();
  }

  const statusValues = useMemo(
    () => ["ALL", ...Array.from(new Set(biens.map((bien) => bien.statut)))],
    [biens],
  );

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

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Recherche reference, ville, adresse..."
            className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
          >
            {statusValues.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "Tous statuts" : status}
              </option>
            ))}
          </select>

          <select
            value={publicationFilter}
            onChange={(event) =>
              setPublicationFilter(
                event.target.value as "ALL" | "ACTIVE" | "INACTIVE",
              )
            }
            className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
          >
            <option value="ALL">Publication: Toutes</option>
            <option value="ACTIVE">Publication active</option>
            <option value="INACTIVE">Publication inactive</option>
          </select>
        </div>
      </div>

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
            {filteredBiens.map((bien) => {
              const isBusy = Boolean(busyIds[bien.id]);
              const canValidate = bien.statut === "EN_ATTENTE_VALIDATION";

              return (
                <tr key={bien.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium text-neutral-800">
                    <Link
                      href={`/admin/dashboard/biens/${bien.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {bien.reference}
                    </Link>
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
                        onClick={() => openRefuseModal(bien.id)}
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
                      <Link
                        href={`/admin/dashboard/biens/${bien.id}`}
                        className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        Voir profil
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredBiens.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={8}>
                  Aucun bien disponible pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {refuseModalBienId !== null ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/60 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900">
              Refuser le bien
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Renseignez un motif clair qui sera envoyé au propriétaire.
            </p>

            <textarea
              value={motifRefusDraft}
              onChange={(event) => setMotifRefusDraft(event.target.value)}
              rows={5}
              className="mt-4 w-full rounded-xl border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-900"
              placeholder="Exemple: Dossier incomplet, photos insuffisantes, incohérence de données..."
            />

            {motifError ? (
              <p className="mt-2 text-sm text-rose-700">{motifError}</p>
            ) : null}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRefuseModal}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRefuse}
                disabled={Boolean(busyIds[refuseModalBienId])}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
