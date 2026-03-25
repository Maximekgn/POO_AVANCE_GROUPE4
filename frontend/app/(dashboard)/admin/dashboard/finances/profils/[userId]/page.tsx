import Link from "next/link";
import { notFound } from "next/navigation";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/app/components/Heading";

import { getAdminFinanceProfile } from "../../../lib/adminApi";

export const dynamic = "force-dynamic";

const formatFcfa = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

export default async function AdminFinanceProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const currentUser = await getCurrentUser();
  const profile = await getAdminFinanceProfile(id, currentUser || {});
  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Heading
          title={`Profil financier - ${profile.user.full_name}`}
          subtitle="Vue consolidée locataire/propriétaire"
        />
        <div className="flex gap-2">
          <Link
            href="/admin/dashboard/finances"
            className="inline-flex rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Retour finances
          </Link>
          <Link
            href={`/admin/dashboard/utilisateurs/${profile.user.id}`}
            className="inline-flex rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Voir profil utilisateur
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm text-emerald-700">Total payé (locataire)</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {formatFcfa(profile.totals.locataire_total_paye)}
          </p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">Total dû (locataire)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-800">
            {formatFcfa(profile.totals.locataire_total_du)}
          </p>
        </article>
        <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-sm text-indigo-700">
            Total dépenses (propriétaire)
          </p>
          <p className="mt-2 text-2xl font-semibold text-indigo-800">
            {formatFcfa(profile.totals.proprietaire_total_depenses)}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">
          Paiements locataire récents
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-3 py-3">Référence</th>
                <th className="px-3 py-3">Bien</th>
                <th className="px-3 py-3">Montant</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {profile.paiements_locataire.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                    Aucun paiement trouvé.
                  </td>
                </tr>
              ) : (
                profile.paiements_locataire.map((item) => (
                  <tr key={item.id} className="border-t border-neutral-100">
                    <td className="px-3 py-3">{item.reference}</td>
                    <td className="px-3 py-3">{item.bien_reference || "-"}</td>
                    <td className="px-3 py-3">{formatFcfa(item.montant)}</td>
                    <td className="px-3 py-3">{item.statut}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/dashboard/finances/paiements/${item.id}`}
                        className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        Détail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">
          Dépenses propriétaire récentes
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-3 py-3">Libellé</th>
                <th className="px-3 py-3">Bien</th>
                <th className="px-3 py-3">Montant</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {profile.depenses_proprietaire.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                    Aucune dépense trouvée.
                  </td>
                </tr>
              ) : (
                profile.depenses_proprietaire.map((item) => (
                  <tr key={item.id} className="border-t border-neutral-100">
                    <td className="px-3 py-3">{item.libelle}</td>
                    <td className="px-3 py-3">{item.bien_reference || "-"}</td>
                    <td className="px-3 py-3">{formatFcfa(item.montant)}</td>
                    <td className="px-3 py-3">{item.date_depense}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/dashboard/finances/depenses/${item.id}`}
                        className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        Détail
                      </Link>
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
