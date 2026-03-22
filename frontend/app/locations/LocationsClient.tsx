"use client";

import type { CurrentUser } from "@/app/actions/getCurrentUser";
import Container from "../components/Container";
import Heading from "../components/Heading";
import ListingCard from "../components/listings/ListingCard";

type ListingItem = {
  id: string;
  imageSrc?: string;
  locationValue?: string;
  ville?: string;
  category?: string;
  price?: number;
  priceMonthly?: number;
};

type ReservationItem = {
  id: string;
  totalPrice?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  listing: ListingItem;
};

interface LocationsClientProps {
  currentUser?: CurrentUser | null;
  reservations: ReservationItem[];
}

const LocationsClient: React.FC<LocationsClientProps> = ({
  currentUser,
  reservations,
}) => {
  return (
    <Container>
      <Heading title="Mes locations" subtitle="Locations et sejours valides" />
      <div
        className="
          mt-10
          grid
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-3
          lg:grid-cols-4
          xl:grid-cols-5
          2xl:grid-cols-6
          gap-8
        "
      >
        {reservations.map((reservation) => (
          <ListingCard
            key={reservation.id}
            data={reservation.listing}
            reservation={reservation}
            currentUser={currentUser}
          />
        ))}
      </div>
    </Container>
  );
};

export default LocationsClient;
