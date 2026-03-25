"use client";

import useCountries from "@/app/(site)/hooks/useCountries";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import ListingCategory from "./ListingCategory";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../Map"), { ssr: false });

interface IListingInfoProps {
  user: { name?: string | null; image?: string | null };
  description: string;
  guestCount: number;
  roomCount: number;
  bathroomCount: number;
  locationValue: string;
  locationLabel?: string;
  latitude?: number | null;
  longitude?: number | null;
  category:
    | { label: string; icon?: IconType | null; description: string }
    | undefined;
}

const StatPill = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center justify-center bg-neutral-50 border border-neutral-100 rounded-xl px-5 py-3 min-w-[72px]">
    <span className="text-lg font-bold text-neutral-900">{value}</span>
    <span className="text-xs text-neutral-500 mt-0.5">{label}</span>
  </div>
);

const ListingInfo: React.FC<IListingInfoProps> = ({
  user,
  description,
  guestCount,
  roomCount,
  bathroomCount,
  locationValue,
  locationLabel,
  latitude,
  longitude,
  category,
}) => {
  const { getByValue } = useCountries();

  const fallbackCoordinates = getByValue(locationValue)?.latlng;
  const coordinates =
    latitude != null && longitude != null
      ? [latitude, longitude]
      : fallbackCoordinates;

  return (
    <div className="col-span-4 flex flex-col gap-8">

      {/* ── Host row ── */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-neutral-900">
            Proposé par{" "}
            <span className="text-neutral-800">{user?.name || "le propriétaire"}</span>
          </h2>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              {guestCount} voyageur{guestCount > 1 ? "s" : ""}
            </span>
            <span className="text-neutral-300">·</span>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {roomCount} chambre{roomCount > 1 ? "s" : ""}
            </span>
            <span className="text-neutral-300">·</span>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
                <path d="M4 12h16M4 12a8 8 0 0 1 16 0" />
                <path d="M6 12v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5" />
              </svg>
              {bathroomCount} salle{bathroomCount > 1 ? "s" : ""} de bain
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <Avatar src={user?.image} />
        </div>
      </div>

      <hr className="border-neutral-100" />

      {/* ── Category ── */}
      {category && (
        <>
          <ListingCategory
            icon={category.icon}
            label={category.label}
            description={category.description}
          />
          <hr className="border-neutral-100" />
        </>
      )}

      {/* ── Description ── */}
      <div>
        <h3 className="text-base font-semibold text-neutral-900 mb-3">
          À propos de ce logement
        </h3>
        <p className="text-neutral-600 leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </div>

      <hr className="border-neutral-100" />

      {/* ── Location label ── */}
      {locationLabel && (
        <>
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm text-neutral-600">{locationLabel}</span>
          </div>
          <hr className="border-neutral-100" />
        </>
      )}

      {/* ── Map ── */}
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
          <Map center={coordinates} />
        </div>

        {coordinates && (
          <a
            href={`https://www.google.com/maps?q=${Array.isArray(coordinates) ? coordinates[0] : ""},${Array.isArray(coordinates) ? coordinates[1] : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-2
              text-sm font-medium text-neutral-700
              hover:text-neutral-900
              underline underline-offset-4
              transition-colors duration-150
              w-fit
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4 shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Ouvrir dans Google Maps
          </a>
        )}
      </div>
    </div>
  );
};

export default ListingInfo;