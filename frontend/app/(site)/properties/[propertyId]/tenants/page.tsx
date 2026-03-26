import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import getReservations from "@/app/(site)/actions/getReservations";
import TenantsClient from "./TenantsClient";

export const dynamic = "force-dynamic";

interface IParams {
  propertyId: string;
}

const TenantsPage = async ({ params }: { params: IParams }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState
          title="Connexion requise"
          subtitle="Veuillez vous connecter pour voir ces informations."
        />
      </ClientOnly>
    );
  }
  
  // Wait for the Promise wrapper (Next 15 params promise behavior if applicable, or just standard param)
  const awaitedParams = await params;
  const propertyId = awaitedParams.propertyId;

  // Récupérer toutes les réservations "reçues" par ce propriétaire
  const reservations = await getReservations({ authorId: currentUser.id.toString() });

  return (
    <ClientOnly>
      <TenantsClient reservations={reservations} propertyId={propertyId} />
    </ClientOnly>
  );
};

export default TenantsPage;
