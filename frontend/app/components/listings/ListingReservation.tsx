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

  return (
    <div
      className="
        bg-white
        rounded-xl
        border-[1px]
        border-neutral-200
        overflow-hidden
      "
    >
      <div className="p-4">
        <div className="flex flex-row items-center gap-1">
          <div className="text-2xl font-semibold">FCFA{price}</div>
          <div className="font-light text-neutral-600">/ nuit</div>
        </div>
        <div className="mt-1 text-sm text-neutral-600">
          FCFA{monthlyPriceValue} / mois
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          Location directe: minimum 30 jours
        </div>
      </div>
      <hr />
      <Calendar
        value={dateRange}
        disabledDates={disabledDates}
        onChange={(value) => onChangeDate(value.selection)}
      />
      <hr />
      <div className="p-4">
        <div className="flex flex-col gap-2">
          <Button
            disabled={disabled}
            onClick={onBookVisit}
            outline
            label="Reserver une visite"
          />
          <Button
            disabled={disabled}
            onClick={onDirectRent}
            label="Louer directement"
          />
          <Button
            disabled={disabled}
            onClick={onPrivatize}
            outline
            label="Privatiser pour la periode"
          />
        </div>
      </div>
      <div
        className="
        p-4
        flex
        flex-col
        gap-2
        font-semibold
        text-base
        "
      >
        <div className="flex items-center justify-between text-neutral-700">
          <span>Nuits selectionnees</span>
          <span>{nightCount}</span>
        </div>
        <div className="flex items-center justify-between text-lg text-neutral-900">
          <span>Total location</span>
          <span>FCFA{totalPrice}</span>
        </div>
      </div>
    </div>
  );
};

export default ListingReservation;
