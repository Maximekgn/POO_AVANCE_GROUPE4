"use client";

import { Range } from "react-date-range";
import Calendar from "../Inputs/Calendar";
import Button from "../Button";

interface IListingReservationProps {
  price: number;
  monthlyPrice?: number;
  dateRange: Range;
  totalPrice: number;
  nightCount: number;
  onChangeDate: (value: Range) => void;
  onBookVisit: () => void;
  onDirectRent: () => void;
  onPrivatize: () => void;
  disabled?: boolean;
  disabledDates?: Date[];
}

const ListingReservation: React.FC<IListingReservationProps> = ({
  price,
  monthlyPrice,
  dateRange,
  totalPrice,
  nightCount,
  onChangeDate,
  onBookVisit,
  onDirectRent,
  onPrivatize,
  disabled,
  disabledDates = [],
}) => {
  const monthlyPriceValue =
    typeof monthlyPrice === "number" && monthlyPrice > 0
      ? monthlyPrice
      : price * 30;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount);

  return (
    <div
      className="
        bg-white
        rounded-2xl
        border border-neutral-200
        shadow-xl shadow-neutral-200/60
        overflow-hidden
        sticky top-24
      "
    >
      {/* ── Price header ── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-neutral-900 tracking-tight">
            {formatPrice(price)}{" "}
            <span className="text-base font-normal text-neutral-500">FCFA</span>
          </span>
          <span className="text-neutral-500 text-sm font-normal">/ nuit</span>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-100 rounded-full px-3 py-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="w-3.5 h-3.5 text-neutral-400"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span className="text-xs font-medium text-neutral-600">
              {formatPrice(monthlyPriceValue)} FCFA / mois
            </span>
          </div>
          <span className="text-xs text-neutral-400">min. 30 jours</span>
        </div>
      </div>

      <hr className="border-neutral-100" />

      {/* ── Calendar ── */}
      <Calendar
        value={dateRange}
        disabledDates={disabledDates}
        onChange={(value) => onChangeDate(value.selection)}
      />

      <hr className="border-neutral-100" />

      {/* ── Night count + total ── */}
      {nightCount > 0 && (
        <>
          <div className="px-6 py-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>
                {formatPrice(price)} FCFA × {nightCount} nuit
                {nightCount > 1 ? "s" : ""}
              </span>
              <span className="font-medium text-neutral-800">
                {formatPrice(totalPrice)} FCFA
              </span>
            </div>
            <hr className="border-neutral-100" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900">Total</span>
              <span className="font-bold text-neutral-900 text-lg">
                {formatPrice(totalPrice)} FCFA
              </span>
            </div>
          </div>
          <hr className="border-neutral-100" />
        </>
      )}

      {/* ── Actions ── */}
      <div className="px-6 py-5 flex flex-col gap-3">
        {/* Primary CTA */}
        <button
          disabled={disabled}
          onClick={onDirectRent}
          className="
            w-full rounded-xl py-3.5 px-4
            bg-gradient-to-r from-rose-500 to-rose-600
            text-white font-semibold text-sm tracking-wide
            shadow-md shadow-rose-200
            hover:from-rose-600 hover:to-rose-700
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
          "
        >
          Louer directement
        </button>

        {/* Secondary CTAs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={disabled}
            onClick={onBookVisit}
            className="
              rounded-xl py-3 px-3
              border border-neutral-300
              text-neutral-700 font-medium text-sm
              hover:border-neutral-400 hover:bg-neutral-50
              active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150
              flex items-center justify-center gap-1.5
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-3.5 h-3.5 shrink-0"
            >
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Visite
          </button>

          <button
            disabled={disabled}
            onClick={onPrivatize}
            className="
              rounded-xl py-3 px-3
              border border-neutral-300
              text-neutral-700 font-medium text-sm
              hover:border-neutral-400 hover:bg-neutral-50
              active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150
              flex items-center justify-center gap-1.5
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-3.5 h-3.5 shrink-0"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Privatiser
          </button>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-1">
          Aucun paiement débité pour l'instant
        </p>
      </div>
    </div>
  );
};

export default ListingReservation;