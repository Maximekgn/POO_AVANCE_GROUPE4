import ClientOnly from "../components/ClientOnly";
import Container from "../components/Container";
import Heading from "../components/Heading";
import EmptyState from "../components/EmptyState";

import getCurrentUser from "../actions/getCurrentUser";
import getReservations from "../actions/getReservations";

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

  const reservations = await getReservations({ userId: currentUser.id });
  const totalReservations = reservations.length;
  const totalDepense = reservations.reduce(
    (acc, reservation: any) => acc + Number(reservation.totalPrice || 0),
    0,
  );
  const moyenne =
    totalReservations > 0 ? Math.round(totalDepense / totalReservations) : 0;

  return (
    <ClientOnly>
      <Container>
        <div className="pt-24">
          <Heading
            title="Mes finances"
            subtitle="Suivi rapide de vos dépenses locatives"
          />

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">Réservations</p>
              <p className="mt-2 text-2xl font-semibold">{totalReservations}</p>
            </article>
            <article className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">Dépenses totales</p>
              <p className="mt-2 text-2xl font-semibold">FCFA {totalDepense}</p>
            </article>
            <article className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">Moyenne / réservation</p>
              <p className="mt-2 text-2xl font-semibold">FCFA {moyenne}</p>
            </article>
          </div>
        </div>
      </Container>
    </ClientOnly>
  );
}
