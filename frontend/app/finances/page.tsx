import ClientOnly from "../components/ClientOnly";
import Container from "../components/Container";
import Heading from "../components/Heading";
import EmptyState from "../components/EmptyState";

import getCurrentUser from "../actions/getCurrentUser";
import getUserFinances from "../actions/getUserFinances";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState
          title="Connexion requise"
          subtitle="Connectez-vous pour consulter vos finances."
        />
      </ClientOnly>
    );
  }

  const financeData = await getUserFinances();

  if (!financeData) {
    return (
      <ClientOnly>
        <EmptyState
          title="Finances indisponibles"
          subtitle="Impossible de recuperer vos donnees financieres pour le moment."
        />
      </ClientOnly>
    );
  }

  const depenses = financeData.summary.depenses_total;
  const revenus = financeData.summary.revenus_total;
  const balance = revenus - depenses;

  return (
    <ClientOnly>
      <Container>
        <div className="pt-24">
          <Heading
            title="Mes finances"
            subtitle="Resume et historique detailles par utilisateur et bien"
          />

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">Depenses</p>
              <p className="mt-2 text-2xl font-semibold">FCFA {depenses}</p>
            </article>
            <article className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">Revenus</p>
              <p className="mt-2 text-2xl font-semibold">FCFA {revenus}</p>
            </article>
            <article className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">Balance</p>
              <p className="mt-2 text-2xl font-semibold">FCFA {balance}</p>
            </article>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-600">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Bien</th>
                  <th className="px-4 py-3">Demande</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Montant</th>
                </tr>
              </thead>
              <tbody>
                {financeData.history.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-neutral-500" colSpan={6}>
                      Aucun mouvement financier a afficher.
                    </td>
                  </tr>
                ) : (
                  financeData.history.map((entry) => (
                    <tr
                      key={`${entry.kind}-${entry.demande_id}`}
                      className="border-t border-neutral-100"
                    >
                      <td className="px-4 py-3">{entry.kind}</td>
                      <td className="px-4 py-3">
                        {entry.bien_reference || `#${entry.bien_id}`}
                      </td>
                      <td className="px-4 py-3">{entry.type_demande || "-"}</td>
                      <td className="px-4 py-3">{entry.statut || "-"}</td>
                      <td className="px-4 py-3">
                        {entry.date_debut || "-"} - {entry.date_fin || "-"}
                      </td>
                      <td className="px-4 py-3">FCFA {entry.montant}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </ClientOnly>
  );
}
