import ClientOnly from "../components/ClientOnly";
import EmptyState from "../components/EmptyState";
import getCurrentUser from "../actions/getCurrentUser";
import getReservations from "../actions/getReservations";
import LocationsClient from "./LocationsClient";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState
          title="Connexion requise"
          subtitle="Connectez-vous pour consulter vos locations."
        />
      </ClientOnly>
    );
  }

  const reservations = await getReservations({ userId: currentUser.id });
  const acceptedReservations = reservations.filter(
    (item: any) => item.status === "ACCEPTEE",
  );

  if (acceptedReservations.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="Aucune location"
          subtitle="Vous n'avez pas encore de location acceptee."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <LocationsClient
        reservations={acceptedReservations}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
}
