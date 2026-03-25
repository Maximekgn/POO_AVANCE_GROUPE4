"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format } from "date-fns";

import useCountries from "@/app/(site)/hooks/useCountries";

type ListingLike = {
  id: string;
  imageSrc?: string;
  locationValue?: string;
  ville?: string;
  category?: string;
  price?: number;
  priceMonthly?: number;
};

type ReservationLike = {
  totalPrice?: number;
  startDate?: string | Date;
  endDate?: string | Date;
};

import HeartButton from "../HeartButton";
import Button from "../Button";

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  "avatars.githubusercontent.com",
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
  "a0.muscache.com",
  "localhost",
  "127.0.0.1",
]);

function getSafeImageSrc(src?: string): string {
  if (!src) {
    return "/placeholder-image.jpg";
  }

  if (src.startsWith("/")) {
    return src;
  }

  try {
    const parsedUrl = new URL(src);
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return ALLOWED_REMOTE_IMAGE_HOSTS.has(parsedUrl.hostname)
        ? src
        : "/placeholder-image.jpg";
    }
  } catch {
    return "/placeholder-image.jpg";
  }

  return "/placeholder-image.jpg";
}

function isLocalDevImage(src: string): boolean {
  try {
    const parsedUrl = new URL(src);
    return (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "::1" ||
      parsedUrl.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

interface ListingCardProps {
  data: ListingLike;
  reservation?: ReservationLike;
  onAction?: (id: string) => void;
  disabled?: boolean;
  actionLabel?: string;
  actionId?: string;
  currentUser?: any | null;
}

const ListingCard: React.FC<ListingCardProps> = ({
  data,
  reservation,
  onAction,
  disabled,
  actionLabel,
  actionId = "",
  currentUser,
}) => {
  const router = useRouter();
  const { getByValue } = useCountries();

  const location = data.locationValue
    ? getByValue(data.locationValue)
    : undefined;

  const handleCancel = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (disabled) {
        return;
      }

      onAction?.(actionId);
    },
    [disabled, onAction, actionId],
  );

  const price = useMemo(() => {
    if (reservation) {
      return reservation.totalPrice;
    }

    return data.price;
  }, [reservation, data.price]);

  const monthlyPrice = useMemo(() => {
    if (typeof data.priceMonthly === "number" && data.priceMonthly > 0) {
      return data.priceMonthly;
    }

    const nightlyPrice = Number(data.price || 0);
    return nightlyPrice * 30;
  }, [data.price, data.priceMonthly]);

  const reservationDate = useMemo(() => {
    if (!reservation || !reservation.startDate || !reservation.endDate) {
      return null;
    }

    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);

    return `${format(start, "PP")} - ${format(end, "PP")}`;
  }, [reservation]);

  const safeImageSrc = useMemo(
    () => getSafeImageSrc(data.imageSrc),
    [data.imageSrc],
  );
  const shouldDisableOptimization = useMemo(
    () => isLocalDevImage(safeImageSrc),
    [safeImageSrc],
  );

  return (
    <div
      onClick={() => router.push(`/listings/${data.id}`)}
      className="col-span-1 cursor-pointer group"
    >
      <div className="flex flex-col gap-2 w-full">
        <div
          className="
            aspect-square 
            w-full 
            relative 
            overflow-hidden 
            rounded-xl
          "
        >
          <Image
            fill
            priority
            sizes="100%"
            unoptimized={shouldDisableOptimization}
            className="
              object-cover 
              h-full 
              w-full 
              group-hover:scale-110 
              transition
            "
            src={safeImageSrc}
            alt="Listing"
          />
          <div
            className="
            absolute
            top-3
            right-3
          "
          >
            <HeartButton listingId={data.id} currentUser={currentUser} />
          </div>
        </div>
        <div className="font-semibold text-lg">
          {location?.region && location?.label
            ? `${location.region}, ${location.label}`
            : data.ville || data.locationValue || "Localisation"}
        </div>
        <div className="font-light text-neutral-500">
          {reservationDate || data.category}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-1">
            <div className="font-semibold">FCFA{price}</div>
            {!reservation && <div className="font-light">/ nuit</div>}
          </div>
          {!reservation && (
            <div className="text-sm text-neutral-600">
              FCFA{monthlyPrice} / mois
            </div>
          )}
        </div>
        {onAction && actionLabel && (
          <Button
            disabled={disabled}
            small
            label={actionLabel}
            onClick={handleCancel}
          />
        )}
      </div>
    </div>
  );
};

export default ListingCard;
