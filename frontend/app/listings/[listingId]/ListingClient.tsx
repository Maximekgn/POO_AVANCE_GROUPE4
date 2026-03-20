"use client";

import Container from "@/app/components/Container";
import ListingHead from "@/app/components/listings/ListingHead";
import ListingInfo from "@/app/components/listings/ListingInfo";
import ListingReservation from "@/app/components/listings/ListingReservation";
import getCategories, { Category } from "@/app/actions/getCategories";
import { TbBeach } from "react-icons/tb";
import useLoginModal from "@/app/hooks/useLoginModal";
import axios from "axios";
import { differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Range } from "react-date-range";
import toast from "react-hot-toast";

type ReservationAction = "VISIT" | "DIRECT_RENT" | "PRIVATIZE";

const initialDateRange = {
  startDate: new Date(),
  endDate: new Date(),
  key: "selection",
};

interface IListingClientProps {
  reservations?: Array<{
    startDate: string | Date;
    endDate: string | Date;
    totalPrice?: number;
  }>;
  listing: {
    id: string;
    title: string;
    imageSrc: string;
    imageSources?: string[];
    locationValue: string;
    locationLabel?: string;
    latitude?: number | null;
    longitude?: number | null;
    category?: string;
    description: string;
    roomCount: number;
    guestCount: number;
    bathroomCount: number;
    price: number;
    priceMonthly?: number;
    user: { name?: string | null; image?: string | null };
  };
  currentUser?: any | null;
}

const ListingClient: React.FC<IListingClientProps> = ({
  listing,
  currentUser,
  reservations = [],
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);
  const loginModal = useLoginModal();
  const router = useRouter();

  const [localReservations, setLocalReservations] = useState(reservations);

  const disableDates = useMemo(() => {
    let dates: Date[] = [];

    localReservations.forEach((reservation) => {
      const range = eachDayOfInterval({
        start: new Date(reservation.startDate),
        end: new Date(reservation.endDate),
      });

      dates = [...dates, ...range];
    });

    return dates;
  }, [localReservations]);

  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [nightCount, setNightCount] = useState(1);
  const [dateRange, setDateRange] = useState<Range>(initialDateRange);

  const onCreateReservation = useCallback(
    async (action: ReservationAction) => {
      if (!currentUser) {
        return loginModal.onOpen();
      }

      if (!dateRange.startDate || !dateRange.endDate) {
        toast.error("Selectionnez une date avant de continuer.");
        return;
      }

      if (action !== "VISIT" && nightCount <= 0) {
        toast.error("Selectionnez une periode valide.");
        return;
      }

      const payload = {
        listingId: listing?.id,
        startDate: dateRange.startDate,
        endDate: action === "VISIT" ? dateRange.startDate : dateRange.endDate,
        totalPrice: action === "VISIT" ? 0 : totalPrice,
        action,
      };

      setIsLoading(true);

      try {
        await axios.post("/api/reservations", payload);

        setLocalReservations((prev) => [
          ...prev,
          {
            startDate: payload.startDate,
            endDate: payload.endDate,
            totalPrice: payload.totalPrice,
          },
        ]);

        if (action === "VISIT") {
          toast.success("Visite reservee pour la date selectionnee.");
        }
        if (action === "DIRECT_RENT") {
          toast.success("Location confirmee pour la periode selectionnee.");
        }
        if (action === "PRIVATIZE") {
          toast.success("Periode privatisée dans le calendrier.");
        }

        setDateRange(initialDateRange);
        router.refresh();
      } catch (error: any) {
        const message =
          error?.response?.data?.error || "Action impossible pour le moment.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentUser,
      dateRange.endDate,
      dateRange.startDate,
      listing?.id,
      loginModal,
      nightCount,
      router,
      totalPrice,
    ],
  );

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      const dayCount = Math.max(
        1,
        differenceInCalendarDays(dateRange.endDate, dateRange.startDate),
      );
      setNightCount(dayCount);

      if (listing.price) {
        setTotalPrice(dayCount * listing.price);
      } else {
        setTotalPrice(listing.price);
      }
    }
  }, [dateRange, listing.price]);

  const category = useMemo(() => {
    const found = categories.find((item) => item.nom === listing.category);
    return found
      ? { label: found.nom, icon: TbBeach, description: found.slug }
      : {
          label: listing.category || "",
          icon: TbBeach,
          description: "Catégorie du bien",
        };
  }, [categories, listing.category]);

  return (
    <Container>
      <div className="max-w-screen-lg mx-auto">
        <div className="flex flex-col gap-6">
          <ListingHead
            title={listing.title}
            imageSrc={listing.imageSrc}
            imageSources={listing.imageSources}
            locationValue={listing.locationValue}
            locationLabel={listing.locationLabel}
            id={listing.id}
            currentUser={currentUser}
          />
          <div
            className="
            grid
            grid-cols-1
            md:grid-cols-7
            md:gap-10
            gap-6
            align-center
          "
          >
            <ListingInfo
              user={listing.user}
              category={category}
              description={listing.description}
              roomCount={listing.roomCount}
              guestCount={listing.guestCount}
              bathroomCount={listing.bathroomCount}
              locationValue={listing.locationValue}
              locationLabel={listing.locationLabel}
              latitude={listing.latitude}
              longitude={listing.longitude}
            />
            <div
              className=" 
                col-span-4               
                order-first
                mb-10
                md:order-last
                md:col-span-3
              "
            >
              <ListingReservation
                price={listing.price}
                monthlyPrice={listing.priceMonthly}
                totalPrice={totalPrice}
                nightCount={nightCount}
                onChangeDate={(value: Range) => setDateRange(value)}
                dateRange={dateRange}
                onBookVisit={() => onCreateReservation("VISIT")}
                onDirectRent={() => onCreateReservation("DIRECT_RENT")}
                onPrivatize={() => onCreateReservation("PRIVATIZE")}
                disabled={isLoading}
                disabledDates={disableDates}
              />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ListingClient;
