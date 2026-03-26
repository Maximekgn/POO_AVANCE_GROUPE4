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
  nb_salons: number;
  nb_chambres: number;
  nb_douches: number;
  caution_mois: number;
  avance_mois: number;
  frais_assistance: number;
  superficie: number;
  avance: number;
  locationValue: string;
  locationLabel?: string;
  latitude?: number | null;
  longitude?: number | null;
  category:
  | { label: string; icon?: IconType | null; description: string }
  | undefined;
}

const DetailRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
  <div className="flex items-center justify-between py-4 border-b border-neutral-100 last:border-0 group">
    <div className="flex items-center gap-3.5">
      <div className="text-neutral-500 group-hover:text-black transition-colors">
        <Icon size={20} />
      </div>
      <span className="text-[15px] font-medium text-neutral-600">{label}</span>
    </div>
    <span className="text-[15px] font-bold text-neutral-900">{value}</span>
  </div>
);

const ListingInfo: React.FC<IListingInfoProps> = ({
  user,
  description,
  guestCount,
  roomCount,
  bathroomCount,
  nb_salons,
  nb_chambres,
  nb_douches,
  caution_mois,
  avance_mois,
  frais_assistance,
  superficie,
  avance,
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
          </div>
        </div>

        <div className="shrink-0">
          <Avatar src={user?.image} />
        </div>
      </div>

      <hr className="border-neutral-200" />
      
      {/* ── Key Details Card ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Détails clés du bien
        </h3>

        <div className="grid grid-cols-1 gap-1">
          <DetailRow
            icon={() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>}
            label="Type"
            value={category?.label || "Bien"}
          />
          <DetailRow
            icon={() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>}
            label="Surface"
            value={`${superficie} m²`}
          />
          <DetailRow
            icon={() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>}
            label="Salon"
            value={nb_salons}
          />
          <DetailRow
            icon={() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>}
            label="Chambres + salon"
            value={`${nb_chambres} + ${nb_salons}`}
          />
          <DetailRow
            icon={() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>}
            label="Cautions + avances"
            value={`${caution_mois} + ${avance_mois} mois`}
          />
          <DetailRow
            icon={() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>}
            label="Douches"
            value={nb_douches}
          />
          <DetailRow
            icon={() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>}
            label="Frais d'assistance"
            value={frais_assistance > 0 ? `${new Intl.NumberFormat('fr-FR').format(frais_assistance)} FCFA` : "100% du loyer mensuel"}
          />
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
              className="w-4 h-4 text-black mt-0.5 shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm text-neutral-600">{locationLabel}</span>
          </div>
          <hr className="border-neutral-100" />
        </>
      )}

      {/* ── Avance ── */}
      {avance > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
            >
              <path d="M12 2v20M17 5H9.5a4.5 4.5 0 0 0 0 9H13a4.5 4.5 0 0 1 0 9H5" />
            </svg>
            <h3 className="text-lg font-bold">Avance sur location</h3>
          </div>
          <p className="text-rose-700 text-2xl font-black">
            {new Intl.NumberFormat("fr-FR").format(avance)} FCFA
          </p>
          <p className="text-rose-600/80 text-sm">
            Ce montant est requis comme avance lors de la signature du bail.
          </p>
        </div>
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