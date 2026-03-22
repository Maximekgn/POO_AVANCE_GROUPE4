import Link from "next/link";
import { notFound } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Heading from "@/app/components/Heading";

import { getAdminExpenseById } from "../../../lib/adminApi";

export const dynamic = "force-dynamic";

const formatFcfa = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

export default async function AdminExpenseDetailPage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  const id = Number(expenseId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const currentUser = await getCurrentUser();
  const expense = await getAdminExpenseById(id, currentUser || {});
  if (!expense) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Heading
          title={`Dépense #${expense.id}`}
          subtitle="Détail opérationnel de la dépense"
        />
        <Link
          href="/admin/dashboard/finances"
          className="inline-flex rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Retour finances
        </Link>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Libellé
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {expense.libelle}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Catégorie
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {expense.categorie}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Montant
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {formatFcfa(expense.montant)}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Date
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {expense.date_depense}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Bien
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {expense.bien_reference || "-"}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Fournisseur
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {expense.fournisseur || "-"}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              N° facture
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {expense.numero_facture || "-"}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Propriétaire
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {expense.proprietaire_nom || expense.proprietaire_email || "-"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
