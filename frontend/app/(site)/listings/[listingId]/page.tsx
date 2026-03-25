import getListingById from "@/app/(site)/actions/getListingById";
import EmptyState from "@/components/EmptyState";
import ListingClient from "./ListingClient";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

interface IParams {
  listingId?: string;
}

export const dynamic = "force-dynamic";

const ListingPage = async ({ params }: { params: Promise<IParams> }) => {
  const resolvedParams = await params;
  const listing = await getListingById(resolvedParams);
  const reservations: any[] = [];
  const currentUser = await getCurrentUser();

  if (!listing) {
    return <EmptyState />;
  }

  return (
    <ListingClient
      listing={listing}
      currentUser={currentUser}
      reservations={reservations}
    />
  );
};

export default ListingPage;
