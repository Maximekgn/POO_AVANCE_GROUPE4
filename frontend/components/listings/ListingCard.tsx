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

import Button from "../Button";
import { AiFillStar } from "react-icons/ai";

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
  currentUser?: any;
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
            rounded-3xl
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
              group-hover:scale-105
              transition
              duration-300
            "
            src={safeImageSrc}
            alt="Listing"
          />
        </div>

        <div className="px-1">
          <div className="font-bold text-[17px] text-neutral-900 line-clamp-1">
            {location?.region && location?.label
              ? `${location.region}, ${location.label}`
              : data.ville || data.locationValue || "Localisation"}
          </div>

          <div className="font-medium text-neutral-500 text-[15px]">
            {reservationDate ? (
              reservationDate
            ) : (
              <span className="flex items-center gap-1">
                À partir de{" "}
                <span className="font-semibold text-neutral-800">
                  FCFA {price?.toLocaleString()}
                </span>
                {!reservation && (
                  <span className="font-normal text-neutral-500"> / nuit</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-sm text-neutral-600 mt-0.5">
            <AiFillStar className="text-neutral-900" size={14} />
            <span className="font-medium text-neutral-900">4,5</span>
          </div>
        </div>

        {onAction && actionLabel && (
          <div className="mt-2">
            <Button
              disabled={disabled}
              small
              label={actionLabel}
              onClick={handleCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingCard;
