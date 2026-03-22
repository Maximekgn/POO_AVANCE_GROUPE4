import Link from "next/link";
import { notFound } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Heading from "@/app/components/Heading";

import { getAdminPaymentById } from "../../../lib/adminApi";

export const dynamic = "force-dynamic";

const formatFcfa = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  const id = Number(paymentId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const currentUser = await getCurrentUser();
  const payment = await getAdminPaymentById(id, currentUser || {});
  if (!payment) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Heading
          title={`Paiement ${payment.reference}`}
          subtitle="Détail opérationnel du règlement"
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
              Référence
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {payment.reference}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Montant
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {formatFcfa(payment.montant)}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Échéance
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {payment.date_echeance}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Date paiement
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {payment.date_paiement || "-"}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Statut
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {payment.statut}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Mode
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {payment.mode_paiement || "-"}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Bien
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {payment.bien_reference || "-"}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Locataire
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {payment.locataire_nom || payment.locataire_email || "-"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            Commentaire
          </h3>
          <p className="mt-1 text-sm text-neutral-700">
            {payment.commentaire || "Aucun commentaire."}
          </p>
        </div>
      </section>
    </div>
  );
}
