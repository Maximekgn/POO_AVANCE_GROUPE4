"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiSend,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import Heading from "@/components/Heading";

import { AdminExpense, AdminFinanceStats, AdminPayment, reverserPaiement } from "../lib/adminApi";

type Props = {
  initialStats: AdminFinanceStats | null;
  initialPayments: AdminPayment[];
  initialExpenses: AdminExpense[];
};

const formatFcfa = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const statusClass = (status: string) => {
  if (status === "PAYE") return "bg-emerald-100 text-emerald-700";
  if (status === "PAYE_A_L_ADMIN") return "bg-blue-100 text-blue-700";
  if (status === "REVERSE_AU_PROPRIETAIRE") return "bg-indigo-100 text-indigo-700";
  if (status === "EN_ATTENTE") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
};

const statusLabel = (status: string) => {
  if (status === "PAYE_A_L_ADMIN") return "Payé à l'Admin";
  if (status === "REVERSE_AU_PROPRIETAIRE") return "Reversé Propriétaire";
  return status.replace("_", " ");
};

export default function FinancesDashboardClient({
  initialStats,
  initialPayments,
  initialExpenses,
}: Props) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<
    "TOUS" | "PAYE" | "PAYE_A_L_ADMIN" | "REVERSE_AU_PROPRIETAIRE" | "EN_ATTENTE" | "IMPAYE"
  >("TOUS");

  const [reversionPayment, setReversionPayment] = useState<AdminPayment | null>(null);
  const [reversionData, setReversionData] = useState({
    mode: "Virement Bancaire",
    preuve: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleReversion = async () => {
    if (!reversionPayment) return;
    if (!reversionData.preuve) {
      toast.error("Veuillez saisir une référence de preuve.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken") || "";
      const res = await reverserPaiement(reversionPayment.id, token, {
        mode_reversement: reversionData.mode,
        preuve_reversement: reversionData.preuve,
      });

      if (res.ok) {
        toast.success("Fonds reversés avec succès !");
        setReversionPayment(null);
        router.refresh();
      } else {
        toast.error(res.message || "Erreur.");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  const stats =
    initialStats ||
    ({
      loyers_attendus: 0,
      loyers_payes: 0,
      en_attente: 0,
      impayes: 0,
      total_depenses: 0,
      taux_recouvrement: 0,
      nombre_paiements: 0,
      nombre_depenses: 0,
    } as AdminFinanceStats);

  const filteredPayments = useMemo(() => {
    if (selectedStatus === "TOUS") return initialPayments;
    return initialPayments.filter((item) => item.statut === selectedStatus);
  }, [initialPayments, selectedStatus]);

  const topExpenses = useMemo(
    () =>
      [...initialExpenses].sort((a, b) => b.montant - a.montant).slice(0, 8),
    [initialExpenses],
  );

  return (
    <div className="space-y-6">
      <Heading
        title="Dashboard Admin - Finances"
        subtitle="Pilotage des loyers, impayés et dépenses en temps réel"
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">Loyers attendus</p>
            <FiDollarSign className="text-black" />
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-800">
            {formatFcfa(stats.loyers_attendus)}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-emerald-700">Loyers payés</p>
            <FiCheckCircle className="text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-700">
            {formatFcfa(stats.loyers_payes)}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-amber-700">En attente</p>
            <FiClock className="text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-700">
            {formatFcfa(stats.en_attente)}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-rose-700">Impayés</p>
            <FiAlertCircle className="text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-700">
            {formatFcfa(stats.impayes)}
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-indigo-700">Dépenses</p>
            <FiDollarSign className="text-indigo-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-indigo-700">
            {formatFcfa(stats.total_depenses)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">
            Paiements locatifs
          </h2>
          <div className="text-sm text-neutral-500">
            Taux recouvrement:{" "}
            <span className="font-semibold">{stats.taux_recouvrement}%</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["TOUS", "PAYE", "PAYE_A_L_ADMIN", "REVERSE_AU_PROPRIETAIRE", "EN_ATTENTE", "IMPAYE"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${selectedStatus === status
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
            >
              {status === "TOUS" ? "Tous" : statusLabel(status)}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-neutral-600">
                <th className="px-3 py-3">Référence</th>
                <th className="px-3 py-3">Bien</th>
                <th className="px-3 py-3">Locataire</th>
                <th className="px-3 py-3">Échéance</th>
                <th className="px-3 py-3">Montant</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td className="px-3 py-5 text-neutral-500" colSpan={7}>
                    Aucun paiement pour ce filtre.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-t border-neutral-100">
                    <td className="px-3 py-3 font-medium text-neutral-800">
                      {payment.reference}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {payment.bien_reference || "-"}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {payment.locataire_nom || payment.locataire_email || "-"}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {payment.date_echeance}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {formatFcfa(payment.montant)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(payment.statut)}`}
                      >
                        {statusLabel(payment.statut)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/dashboard/finances/paiements/${payment.id}`}
                          className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                        >
                          Détail paiement
                        </Link>
                        {payment.locataire_id ? (
                          <Link
                            href={`/admin/dashboard/finances/profils/${payment.locataire_id}`}
                            className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                          >
                            Profil financier
                          </Link>
                        ) : null}
                        {payment.statut === "PAYE_A_L_ADMIN" ? (
                          <button
                            onClick={() => setReversionPayment(payment)}
                            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            <FiSend size={12} />
                            Reverser au Proprio
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-800">
          Dépenses récentes
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-neutral-600">
                <th className="px-3 py-3">Libellé</th>
                <th className="px-3 py-3">Catégorie</th>
                <th className="px-3 py-3">Bien</th>
                <th className="px-3 py-3">Montant</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {topExpenses.length === 0 ? (
                <tr>
                  <td className="px-3 py-5 text-neutral-500" colSpan={6}>
                    Aucune dépense enregistrée.
                  </td>
                </tr>
              ) : (
                topExpenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-neutral-100">
                    <td className="px-3 py-3 font-medium text-neutral-800">
                      {expense.libelle}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {expense.categorie}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {expense.bien_reference || "-"}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {formatFcfa(expense.montant)}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {expense.date_depense}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/dashboard/finances/depenses/${expense.id}`}
                          className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                        >
                          Détail dépense
                        </Link>
                        {expense.proprietaire_id ? (
                          <Link
                            href={`/admin/dashboard/finances/profils/${expense.proprietaire_id}`}
                            className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                          >
                            Profil financier
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Reversement */}
      {reversionPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-neutral-800">
              Confirmer le Reversement
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Vous allez marquer le paiement <b>{reversionPayment.reference}</b> (
              {formatFcfa(reversionPayment.montant)}) comme reversé au propriétaire.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-neutral-400">
                  Mode de reversement
                </label>
                <select
                  value={reversionData.mode}
                  onChange={(e) =>
                    setReversionData({ ...reversionData, mode: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="Virement Bancaire">Virement Bancaire</option>
                  <option value="Mobile Money (Orange)">
                    Mobile Money (Orange)
                  </option>
                  <option value="Mobile Money (MTN)">Mobile Money (MTN)</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Espèces">Espèces</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-neutral-400">
                  Référence de la preuve
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ref Virement, Transaction ID..."
                  value={reversionData.preuve}
                  onChange={(e) =>
                    setReversionData({
                      ...reversionData,
                      preuve: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                disabled={submitting}
                onClick={() => setReversionPayment(null)}
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                disabled={submitting}
                onClick={handleReversion}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Traitement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
