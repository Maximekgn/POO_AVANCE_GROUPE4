"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import useCountries from "@/app/(site)/hooks/useCountries";
import Button from "@/components/Button";

type ListingItem = {
  id: string;
  title: string;
  imageSrc?: string;
  locationValue?: string;
  ville?: string;
  category?: string;
  price?: number;
  priceMonthly?: number;
  statut?: string;
};

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  "avatars.githubusercontent.com",
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
  "a0.muscache.com",
  "localhost",
  "127.0.0.1",
]);

function getSafeImageSrc(src?: string): string {
  if (!src) return "/placeholder-image.jpg";
  if (src.startsWith("/")) return src;
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

interface OwnerListingCardProps {
  data: ListingItem;
  onAction?: (id: string, actionName: string) => void;
  disabled?: boolean;
}

const OwnerListingCard: React.FC<OwnerListingCardProps> = ({
  data,
  onAction,
  disabled,
}) => {
  const router = useRouter();
  const { getByValue } = useCountries();

  const location = data.locationValue ? getByValue(data.locationValue) : undefined;
  
  const safeImageSrc = useMemo(() => getSafeImageSrc(data.imageSrc), [data.imageSrc]);
  const shouldDisableOptimization = useMemo(() => isLocalDevImage(safeImageSrc), [safeImageSrc]);

  return (
    <div className="col-span-1 flex flex-col gap-2 w-full group">
      <div 
        className="aspect-square w-full relative overflow-hidden rounded-3xl cursor-pointer"
        onClick={() => router.push(`/listings/${data.id}`)}
      >
        <Image
          fill
          unoptimized={shouldDisableOptimization}
          className="object-cover h-full w-full group-hover:scale-105 transition duration-300"
          src={safeImageSrc}
          alt={data.title}
        />
        {data.statut && (
          <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-full text-xs font-bold text-neutral-800 shadow-sm">
            {data.statut.replace(/_/g, " ")}
          </div>
        )}
      </div>

      <div className="px-1 mt-1">
        <div className="font-bold text-lg text-neutral-900 line-clamp-1">
            {data.title}
        </div>
        <div className="font-medium text-neutral-500 text-sm">
          {location?.region && location?.label
            ? `${location.region}, ${location.label}`
            : data.ville || data.locationValue || "Localisation"}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <button
          disabled={disabled}
          onClick={() => onAction?.(data.id, "EDIT")}
          className="w-full bg-neutral-100 text-neutral-800 font-semibold py-2 rounded-xl text-sm transition hover:bg-neutral-200 disabled:opacity-50"
        >
          Modifier le bien
        </button>
        <div className="grid grid-cols-2 gap-2">
            <button
                disabled={disabled}
                onClick={() => onAction?.(data.id, "TENANTS")}
                className="w-full bg-blue-50 text-blue-600 font-semibold py-2 rounded-xl text-xs transition hover:bg-blue-100 disabled:opacity-50 line-clamp-1 px-1"
            >
                Locataires
            </button>
            <button
                disabled={disabled}
                onClick={() => onAction?.(data.id, "FINANCE")}
                className="w-full bg-emerald-50 text-emerald-600 font-semibold py-2 rounded-xl text-xs transition hover:bg-emerald-100 disabled:opacity-50 line-clamp-1 px-1"
            >
                Finances
            </button>
        </div>
        <button
          disabled={disabled}
          onClick={() => onAction?.(data.id, "DELETE")}
          className="w-full bg-white border border-rose-200 text-rose-600 font-semibold py-2 rounded-xl text-xs transition hover:bg-rose-50 disabled:opacity-50"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
};

export default OwnerListingCard;
