import Heading from "@/app/components/Heading";
import getCurrentUser from "@/app/actions/getCurrentUser";

export const dynamic = "force-dynamic";

export default async function AdminUtilisateursPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="space-y-6">
      <Heading
        title="Utilisateurs"
        subtitle="Contrôle d'accès et suivi des comptes"
      />

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Session administrateur</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Nom
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-800">
              {currentUser?.name || "Admin"}
            </dd>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Email
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-800">
              {currentUser?.email || "-"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Pages utiles</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>Dashboard global pour le suivi des biens</li>
          <li>Module finances pour le pilotage économique</li>
          <li>Vue biens pour contrôler les statuts et loyers</li>
        </ul>
      </section>
    </div>
  );
}
