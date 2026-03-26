"use client";

import Container from "@/components/Container";
import ListingHead from "@/components/listings/ListingHead";
import ListingInfo from "@/components/listings/ListingInfo";
import ListingReservation from "@/components/listings/ListingReservation";
import getCategories, { Category } from "@/app/(site)/actions/getCategories";
import { TbBeach } from "react-icons/tb";
import useLoginModal from "@/app/(site)/hooks/useLoginModal";
import axios from "axios";
import { differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Range } from "react-date-range";
import toast from "react-hot-toast";
import BackButton from "@/components/BackButton";

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
    nb_salons: number;
    nb_chambres: number;
    nb_douches: number;
    caution_mois: number;
    avance_mois: number;
    frais_assistance: number;
    superficie: number;
    price: number;
    priceMonthly?: number;
    avance: number;
    ownerId: number;
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

      const payload: any = {
        listingId: listing?.id,
        action,
      };

      if (action === "DIRECT_RENT" && (!dateRange.startDate || !dateRange.endDate || nightCount < 30)) {
        // Default to today + 30 days if no dates or too short
        const start = new Date();
        const end = new Date();
        end.setDate(start.getDate() + 30);
        
        payload.startDate = start;
        payload.endDate = end;
        payload.totalPrice = listing.priceMonthly || (listing.price * 30);
      } else {
        if (!dateRange.startDate || !dateRange.endDate) {
          toast.error("Selectionnez une date avant de continuer.");
          return;
        }

        if (action !== "VISIT" && nightCount <= 0) {
          toast.error("Selectionnez une periode valide.");
          return;
        }

        payload.startDate = dateRange.startDate;
        payload.endDate = action === "VISIT" ? dateRange.startDate : dateRange.endDate;
        payload.totalPrice = action === "VISIT" ? 0 : totalPrice;
      }

      setIsLoading(true);

      try {
        const response = await axios.post("/api/reservations", payload);

        setLocalReservations((prev) => [
          ...prev,
          {
            startDate: payload.startDate,
            endDate: payload.endDate,
            totalPrice: payload.totalPrice,
          },
        ]);

        if (action === "VISIT") {
          toast.success("Demande de visite envoyee.");
        }
        if (action === "DIRECT_RENT") {
          toast.success("Demande de location envoyee.");
        }
        if (action === "PRIVATIZE") {
          toast.success("Demande de privatisation envoyee.");
        }

        const conversationId = response?.data?.conversation_id;
        if (typeof conversationId === "string" && conversationId.length > 0) {
          window.dispatchEvent(
            new CustomEvent("chat:open", {
              detail: { conversationId },
            }),
          );
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
      listing.price,
      listing.priceMonthly,
      listing.id,
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

  const isOwner = currentUser?.id && listing.ownerId ? String(currentUser.id) === String(listing.ownerId) : false;

  return (
    <Container>
      <div className="max-w-7xl mx-auto">
        <BackButton />
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
            md:gap-12
            gap-8
            mt-8
          "
          >
            <ListingInfo
              user={listing.user}
              category={category}
              description={listing.description}
              roomCount={listing.roomCount}
              guestCount={listing.guestCount}
              bathroomCount={listing.bathroomCount}
              nb_salons={listing.nb_salons}
              nb_chambres={listing.nb_chambres}
              nb_douches={listing.nb_douches}
              caution_mois={listing.caution_mois}
              avance_mois={listing.avance_mois}
              frais_assistance={listing.frais_assistance}
              superficie={listing.superficie}
              avance={listing.avance}
              locationValue={listing.locationValue}
              locationLabel={listing.locationLabel}
              latitude={listing.latitude}
              longitude={listing.longitude}
            />
            <div
              className=" 
                col-span-1
                md:col-span-3
                order-first
                md:order-last
                mb-10
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
                disabled={isLoading || isOwner}
                disabledDates={disableDates}
                isOwner={isOwner}
              />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ListingClient;
