import Link from "next/link";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Heading from "@/app/components/Heading";

import { getAdminBiens, getStatusStats } from "./lib/adminApi";

export const dynamic = "force-dynamic";

export default async function AdminDashboardHomePage() {
  const currentUser = await getCurrentUser();
  const biens = await getAdminBiens(currentUser || {});
  const stats = getStatusStats(biens);

  return (
    <div className="space-y-6">
      <Heading
        title="Dashboard administrateur"
        subtitle="Pilotez la plateforme depuis un espace dédié"
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Total biens</p>
          <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Vacants</p>
          <p className="mt-2 text-2xl font-semibold">{stats.vacant}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Loués</p>
          <p className="mt-2 text-2xl font-semibold">{stats.rented}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">En attente</p>
          <p className="mt-2 text-2xl font-semibold">{stats.pending}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">En travaux</p>
          <p className="mt-2 text-2xl font-semibold">{stats.works}</p>
        </article>
      </section>

      {stats.pending > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">
            {stats.pending} nouveau(x) bien(s) soumis
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Ces biens doivent etre valides par un administrateur avant de
            devenir publics.
          </p>
          <Link
            href="/admin/dashboard/biens"
            className="mt-4 inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Gerer les validations
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Actions rapides</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link
            href="/admin/dashboard/biens"
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Voir tous les biens
          </Link>
          <Link
            href="/admin/dashboard/finances"
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Ouvrir le module finances
          </Link>
          <Link
            href="/admin/dashboard/utilisateurs"
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Gestion utilisateurs
          </Link>
        </div>
      </section>
    </div>
  );
}
