"use client";

import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
} from "react-icons/fi";

import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";

type FinancialStatus = "PAYE" | "EN_ATTENTE" | "IMPAYE";

type FinancialRow = {
  id: string;
  bien: string;
  locataire: string;
  montant: number;
  echeance: string;
  datePaiement?: string;
  status: FinancialStatus;
};

const MOCK_FINANCIAL_ROWS: FinancialRow[] = [
  {
    id: "FIN-001",
    bien: "BIEN-DEMO-001",
    locataire: "K. Lawson",
    montant: 120000,
    echeance: "2026-03-05",
    datePaiement: "2026-03-04",
    status: "PAYE",
  },
  {
    id: "FIN-002",
    bien: "BIEN-DEMO-002",
    locataire: "A. Mensah",
    montant: 280000,
    echeance: "2026-03-05",
    status: "EN_ATTENTE",
  },
  {
    id: "FIN-003",
    bien: "BIEN-DEMO-003",
    locataire: "R. Dossou",
    montant: 450000,
    echeance: "2026-03-05",
    status: "IMPAYE",
  },
  {
    id: "FIN-004",
    bien: "BIEN-DEMO-002",
    locataire: "A. Mensah",
    montant: 280000,
    echeance: "2026-02-05",
    datePaiement: "2026-02-06",
    status: "PAYE",
  },
  {
    id: "FIN-005",
    bien: "BIEN-DEMO-001",
    locataire: "K. Lawson",
    montant: 120000,
    echeance: "2026-02-05",
    datePaiement: "2026-02-03",
    status: "PAYE",
  },
  {
    id: "FIN-006",
    bien: "BIEN-DEMO-003",
    locataire: "R. Dossou",
    montant: 450000,
    echeance: "2026-02-05",
    status: "IMPAYE",
  },
];

const formatFcfa = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const statusClass = (status: FinancialStatus) => {
  if (status === "PAYE") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "EN_ATTENTE") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
};

const FinancesDashboardClient = () => {
  const [selectedStatus, setSelectedStatus] = useState<
    "TOUS" | FinancialStatus
  >("TOUS");

  const filteredRows = useMemo(() => {
    if (selectedStatus === "TOUS") {
      return MOCK_FINANCIAL_ROWS;
    }
    return MOCK_FINANCIAL_ROWS.filter((row) => row.status === selectedStatus);
  }, [selectedStatus]);

  const summary = useMemo(() => {
    const loyersAttendus = MOCK_FINANCIAL_ROWS.reduce(
      (acc, row) => acc + row.montant,
      0,
    );
    const loyersPayes = MOCK_FINANCIAL_ROWS.filter(
      (row) => row.status === "PAYE",
    ).reduce((acc, row) => acc + row.montant, 0);
    const impayes = MOCK_FINANCIAL_ROWS.filter(
      (row) => row.status === "IMPAYE",
    ).reduce((acc, row) => acc + row.montant, 0);
    const enAttente = MOCK_FINANCIAL_ROWS.filter(
      (row) => row.status === "EN_ATTENTE",
    ).reduce((acc, row) => acc + row.montant, 0);

    const tauxRecouvrement =
      loyersAttendus > 0 ? Math.round((loyersPayes / loyersAttendus) * 100) : 0;

    return {
      loyersAttendus,
      loyersPayes,
      impayes,
      enAttente,
      tauxRecouvrement,
    };
  }, []);

  const byBien = useMemo(() => {
    const map = new Map<string, { attendu: number; paye: number }>();

    for (const row of MOCK_FINANCIAL_ROWS) {
      const current = map.get(row.bien) || { attendu: 0, paye: 0 };
      current.attendu += row.montant;
      if (row.status === "PAYE") {
        current.paye += row.montant;
      }
      map.set(row.bien, current);
    }

    return Array.from(map.entries()).map(([bien, values]) => {
      const rate =
        values.attendu > 0
          ? Math.round((values.paye / values.attendu) * 100)
          : 0;
      return {
        bien,
        ...values,
        rate,
      };
    });
  }, []);

  return (
    <Container>
      <div className="pt-24 pb-12 space-y-8">
        <Heading
          title="Dashboard Admin - Finances"
          subtitle="Suivi global des loyers: encaissés, en attente, impayés, et performance de recouvrement"
        />

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">Loyers attendus</p>
              <FiDollarSign className="text-neutral-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-neutral-800">
              {formatFcfa(summary.loyersAttendus)}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-emerald-700">Loyers payés</p>
              <FiCheckCircle className="text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-700">
              {formatFcfa(summary.loyersPayes)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-700">En attente</p>
              <FiClock className="text-amber-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-amber-700">
              {formatFcfa(summary.enAttente)}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-rose-700">Impayés</p>
              <FiAlertCircle className="text-rose-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-rose-700">
              {formatFcfa(summary.impayes)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-800">
              Recouvrement par bien
            </h2>
            <div className="text-sm text-neutral-500">
              Taux global: {summary.tauxRecouvrement}%
            </div>
          </div>

          <div className="space-y-4">
            {byBien.map((item) => (
              <div key={item.bien} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700">
                    {item.bien}
                  </span>
                  <span className="text-neutral-500">
                    {formatFcfa(item.paye)} / {formatFcfa(item.attendu)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100">
                  <div
                    className="h-2 rounded-full bg-neutral-800"
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-800">
              Détail des loyers
            </h2>
            <div className="flex items-center gap-2">
              {(["TOUS", "PAYE", "EN_ATTENTE", "IMPAYE"] as const).map(
                (status) => (
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
                ),
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-3 pr-3">Référence</th>
                  <th className="py-3 pr-3">Bien</th>
                  <th className="py-3 pr-3">Locataire</th>
                  <th className="py-3 pr-3">Échéance</th>
                  <th className="py-3 pr-3">Montant</th>
                  <th className="py-3 pr-3">Paiement</th>
                  <th className="py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-100 text-neutral-700"
                  >
                    <td className="py-3 pr-3 font-medium">{row.id}</td>
                    <td className="py-3 pr-3">{row.bien}</td>
                    <td className="py-3 pr-3">{row.locataire}</td>
                    <td className="py-3 pr-3">{row.echeance}</td>
                    <td className="py-3 pr-3 font-semibold">
                      {formatFcfa(row.montant)}
                    </td>
                    <td className="py-3 pr-3">{row.datePaiement || "-"}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}
                      >
                        {row.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Container>
  );
};

export default FinancesDashboardClient;
