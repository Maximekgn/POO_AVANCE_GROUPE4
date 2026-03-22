import Heading from "@/app/components/Heading";
import getCurrentUser from "@/app/actions/getCurrentUser";

import { getAdminUsers } from "../lib/adminApi";
import AdminUsersTableClient from "./AdminUsersTableClient";

export const dynamic = "force-dynamic";

export default async function AdminUtilisateursPage() {
  const currentUser = await getCurrentUser();
  const users = await getAdminUsers(currentUser || {});

  const stats = users.reduce(
    (acc, user) => {
      acc.total += 1;
      if (user.is_admin) acc.admins += 1;
      if (user.is_active) acc.active += 1;
      if (user.email_verifie) acc.verified += 1;
      if (user.documents_complets) acc.documents += 1;
      if (user.nombre_biens > 0) acc.proprietaires += 1;
      return acc;
    },
    {
      total: 0,
      admins: 0,
      active: 0,
      verified: 0,
      documents: 0,
      proprietaires: 0,
    },
  );

  return (
    <div className="space-y-6">
      <Heading
        title="Utilisateurs"
        subtitle="Vue entreprise des comptes avec filtres avancés et accès fiche détaillée"
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Total comptes</p>
          <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Admins</p>
          <p className="mt-2 text-2xl font-semibold">{stats.admins}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Comptes actifs</p>
          <p className="mt-2 text-2xl font-semibold">{stats.active}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Propriétaires</p>
          <p className="mt-2 text-2xl font-semibold">{stats.proprietaires}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Emails vérifiés</p>
          <p className="mt-2 text-2xl font-semibold">{stats.verified}</p>
        </article>
      </section>

      <AdminUsersTableClient users={users} />
    </div>
  );
}
