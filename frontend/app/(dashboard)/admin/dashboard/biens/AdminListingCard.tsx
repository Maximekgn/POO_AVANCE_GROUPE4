"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { AdminBien } from "../lib/adminApi";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Star } from "lucide-react";

interface AdminListingCardProps {
  data: AdminBien;
  onValidate?: (id: number) => void;
  onRefuse?: (id: number) => void;
  onToggleActivation?: (bien: AdminBien) => void;
  disabled?: boolean;
}

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  "avatars.githubusercontent.com",
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
  "a0.muscache.com",
  "localhost",
  "127.0.0.1",
]);

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace("/api", "");

function getSafeImageSrc(src?: string): string {
  if (!src) {
    return "/placeholder-image.jpg";
  }

  // If it's already an absolute URL
  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      const parsedUrl = new URL(src);
      if (ALLOWED_REMOTE_IMAGE_HOSTS.has(parsedUrl.hostname)) {
        return src;
      }
      return "/placeholder-image.jpg";
    } catch {
      return "/placeholder-image.jpg";
    }
  }

  // If it's a relative path starting with /
  if (src.startsWith("/")) {
    return src;
  }

  // If it's a relative path from the backend (e.g. "media/...")
  return `${API_BASE_URL}/${src}`;
}

function isLocalDevImage(src: string): boolean {
  return src.includes("localhost") || src.includes("127.0.0.1");
}

const AdminListingCard: React.FC<AdminListingCardProps> = ({
  data,
  onValidate,
  onRefuse,
  onToggleActivation,
  disabled,
}) => {
  const router = useRouter();

  const imageSrc = useMemo(() => {
    const principal = data.photos?.find((p) => p.principale);
    const first = data.photos?.[0];
    const src =
      principal?.image || principal?.url || first?.image || first?.url;
    return getSafeImageSrc(src as string | undefined);
  }, [data.photos]);

  const canValidate = data.statut === "EN_ATTENTE_VALIDATION";

  const statusColor = useMemo(() => {
    switch (data.statut) {
      case "VACANT":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "LOUE":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "EN_ATTENTE_VALIDATION":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "EN_TRAVAUX":
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
      case "REFUSE":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  }, [data.statut]);

  const activationColor = data.is_active
    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
    : "bg-rose-50 text-rose-600 border-rose-100";

  return (
    <div className="group flex flex-col gap-3 rounded-[2rem]  p-3 transition hover:shadow-xl hover:border-transparent bg-white">
      <div
        onClick={() => router.push(`/admin/dashboard/biens/${data.id}`)}
        className="relative aspect-square w-full overflow-hidden rounded-[1.5rem] cursor-pointer"
      >
        <Image
          fill
          src={imageSrc}
          alt={data.reference}
          unoptimized={isLocalDevImage(imageSrc)}
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusColor} backdrop-blur-md bg-opacity-90`}
          >
            {data.statut.replace(/_/g, " ")}
          </div>
          <div
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${activationColor} backdrop-blur-md bg-opacity-90`}
          >
            {data.is_active ? "Actif" : "Désactivé"}
          </div>
        </div>
        <div className="absolute bottom-3 right-3 rounded-xl bg-white/90 px-3 py-1.5 text-[10px] font-mono font-bold text-neutral-900 shadow-sm backdrop-blur-md">
          {data.reference}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-2">
        <div className="flex items-start justify-between">
          <div className="font-bold text-neutral-900 text-lg line-clamp-1 tracking-tight">
            {data.ville}
            {data.quartier ? `, ${data.quartier}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="text-sm font-medium text-neutral-500 line-clamp-1">
            {data.categorie_nom} • {data.sous_type_nom || "Type non défini"}
          </div>
        </div>

        <div className="mt-0.5 flex flex-col gap-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-neutral-900">
              FCFA{" "}
              {Number(data.loyer_hc || data.prix_mois || 0).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-neutral-500">
              / mois
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1 text-sm">
              <Star className="text-neutral-900 fill-yellow-400" size={14} />
              <span className="font-bold text-neutral-900">4,5</span>
            </div>
            {data.date_creation && (
              <div className="text-[10px] font-medium text-black">
                {format(new Date(data.date_creation), "dd MMM yyyy", {
                  locale: fr,
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-neutral-50">
        {canValidate ? (
          <>
            <button
              onClick={() => onValidate?.(data.id)}
              disabled={disabled}
              className="rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              Valider
            </button>
            <button
              onClick={() => onRefuse?.(data.id)}
              disabled={disabled}
              className="rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              Refuser
            </button>
          </>
        ) : (
          <button
            onClick={() => onToggleActivation?.(data)}
            disabled={disabled}
            className={`col-span-1 rounded-xl border py-2 text-xs font-semibold transition disabled:opacity-50 ${
              data.is_active
                ? "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {data.is_active ? "Désactiver" : "Réactiver"}
          </button>
        )}
        <button
          onClick={() => router.push(`/admin/dashboard/biens/${data.id}`)}
          className={`rounded-xl border border-neutral-200 bg-white py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 ${!canValidate ? "col-span-1" : "col-span-2"}`}
        >
          Détails
        </button>
      </div>
    </div>
  );
};

export default AdminListingCard;
