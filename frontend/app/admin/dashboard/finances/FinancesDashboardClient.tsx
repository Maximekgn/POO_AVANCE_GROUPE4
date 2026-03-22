"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
} from "react-icons/fi";

import Heading from "@/app/components/Heading";

import { AdminExpense, AdminFinanceStats, AdminPayment } from "../lib/adminApi";

type Props = {
  initialStats: AdminFinanceStats | null;
  initialPayments: AdminPayment[];
  initialExpenses: AdminExpense[];
};

const formatFcfa = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const statusClass = (status: string) => {
  if (status === "PAYE") return "bg-emerald-100 text-emerald-700";
  if (status === "EN_ATTENTE") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
};

export default function FinancesDashboardClient({
  initialStats,
  initialPayments,
  initialExpenses,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState<
    "TOUS" | "PAYE" | "EN_ATTENTE" | "IMPAYE"
  >("TOUS");

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
            <FiDollarSign className="text-neutral-400" />
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
          {(["TOUS", "PAYE", "EN_ATTENTE", "IMPAYE"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === status
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {status === "TOUS" ? "Tous" : status.replace("_", " ")}
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
                        {payment.statut.replace("_", " ")}
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
    </div>
  );
}
