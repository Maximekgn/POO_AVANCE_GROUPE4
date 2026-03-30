"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

import AdminListingCard from "./AdminListingCard";

export default function BiensTableClient({ initialBiens, accessToken }: Props) {
  const router = useRouter();
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
  const [viewMode, setViewMode] = useState<"CARD" | "TABLE">("CARD");

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
        bien.ville || "",
        bien.adresse || "",
        bien.quartier || "",
        bien.categorie_nom || "",
        bien.sous_type_nom || "",
        bien.proprietaire_nom || "",
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
    setMessage("Bien validé. Le propriétaire a été notifié par email.");
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
      setMessage(result.message || "Mise à jour impossible.");
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
        ? "Bien activé avec succès."
        : "Bien désactivé avec succès.",
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

    setBiens((prev) => prev.filter((item) => item.id !== refuseModalBienId));
    setMessage("Bien refusé. Le propriétaire a été notifié par email.");
    setBusyIds((prev) => ({ ...prev, [refuseModalBienId]: false }));
    closeRefuseModal();
    router.refresh();
  }

  const statusValues = useMemo(
    () => ["ALL", ...Array.from(new Set(biens.map((bien) => bien.statut)))],
    [biens],
  );

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-700">
              <span className="text-lg font-bold">!</span>
            </div>
            <div>
              <p className="font-bold text-amber-900">
                {pendingCount} bien{pendingCount > 1 ? "s" : ""} en attente de
                validation
              </p>
              <p className="text-sm text-amber-800/80">
                Action administrative requise avant la publication sur la
                plateforme.
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm transition-all">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-neutral-900">
              Filtrer les biens
            </h3>
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("CARD")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  viewMode === "CARD"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode("TABLE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  viewMode === "TABLE"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                Tableau
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
            <div className="md:col-span-2 lg:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black ml-1 mb-1 block">
                Recherche
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Réf, ville, quartier, proprio..."
                className="h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-black ml-1 mb-1 block">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none transition focus:border-neutral-900 focus:bg-white"
              >
                {statusValues.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL"
                      ? "Tous les statuts"
                      : status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-black ml-1 mb-1 block">
                Publication
              </label>
              <select
                value={publicationFilter}
                onChange={(event) =>
                  setPublicationFilter(
                    event.target.value as "ALL" | "ACTIVE" | "INACTIVE",
                  )
                }
                className="h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none transition focus:border-neutral-900 focus:bg-white"
              >
                <option value="ALL">Toutes</option>
                <option value="ACTIVE">Actifs uniquement</option>
                <option value="INACTIVE">Inactifs uniquement</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setQuery("");
                  setStatusFilter("ALL");
                  setPublicationFilter("ALL");
                }}
                className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "CARD" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBiens.map((bien) => (
            <AdminListingCard
              key={bien.id}
              data={bien}
              onValidate={handleValidate}
              onRefuse={openRefuseModal}
              onToggleActivation={handleToggleActivation}
              disabled={Boolean(busyIds[bien.id])}
            />
          ))}
          {filteredBiens.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-neutral-100 p-6 text-black mb-4">
                <svg
                  className="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                Aucun bien trouvé
              </h3>
              <p className="mt-1 text-neutral-500">
                Essayez de modifier vos filtres ou de réinitialiser la
                recherche.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50/50 text-left text-neutral-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Référence</th>
                <th className="px-6 py-4">Localisation</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Publication</th>
                <th className="px-6 py-4">Prix</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredBiens.map((bien) => {
                const isBusy = Boolean(busyIds[bien.id]);
                const canValidate = bien.statut === "EN_ATTENTE_VALIDATION";

                return (
                  <tr
                    key={bien.id}
                    className="group hover:bg-neutral-50/50 transition"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/dashboard/biens/${bien.id}`}
                        className="font-bold text-neutral-900 hover:underline"
                      >
                        {bien.reference}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-800">
                          {bien.ville}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {bien.quartier || bien.adresse}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {bien.sous_type_nom || bien.categorie_nom || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          bien.statut === "VACANT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : bien.statut === "LOUE"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : bien.statut === "EN_ATTENTE_VALIDATION"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-neutral-50 text-neutral-600 border-neutral-100"
                        }`}
                      >
                        {bien.statut.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          bien.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}
                      >
                        {bien.is_active ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900">
                      FCFA{" "}
                      {Number(
                        bien.loyer_hc || bien.prix_mois || 0,
                      ).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canValidate ? (
                          <>
                            <button
                              onClick={() => handleValidate(bien.id)}
                              disabled={isBusy}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-30"
                              title="Valider"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => openRefuseModal(bien.id)}
                              disabled={isBusy}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                              title="Refuser"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleToggleActivation(bien)}
                            disabled={isBusy}
                            className={`p-2 rounded-lg transition disabled:opacity-30 ${bien.is_active ? "text-black hover:bg-neutral-100" : "text-emerald-600 hover:bg-emerald-50"}`}
                            title={bien.is_active ? "Désactiver" : "Activer"}
                          >
                            {bien.is_active ? (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                        <Link
                          href={`/admin/dashboard/biens/${bien.id}`}
                          className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
                          title="Voir profil"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredBiens.length === 0 && (
            <div className="px-6 py-12 text-center text-neutral-500">
              Aucun bien disponible pour le moment.
            </div>
          )}
        </div>
      )}

      {refuseModalBienId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl scale-in-center rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">
                  Refuser le bien
                </h3>
                <p className="text-sm text-neutral-500">
                  Veuillez expliquer pourquoi ce bien ne peut pas être validé.
                </p>
              </div>
            </div>

            <textarea
              value={motifRefusDraft}
              onChange={(event) => setMotifRefusDraft(event.target.value)}
              rows={5}
              className="mt-4 w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900"
              placeholder="Exemple: Dossier incomplet, photos de mauvaise qualité, incohérence de prix..."
            />

            {motifError ? (
              <p className="mt-2 text-sm font-medium text-rose-600">
                {motifError}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRefuseModal}
                className="rounded-2xl border border-neutral-200 px-6 py-3 text-sm font-bold text-neutral-600 transition hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRefuse}
                disabled={Boolean(busyIds[refuseModalBienId])}
                className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
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
