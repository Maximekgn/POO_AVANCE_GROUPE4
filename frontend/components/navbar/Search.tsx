"use client";

import useCountries from "@/app/(site)/hooks/useCountries";
import useSearchModal from "@/app/(site)/hooks/useSearchModal";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BiSearch } from "react-icons/bi";

const Search = () => {
  const searchModal = useSearchModal();
  const params = useSearchParams();
  const { getByValue: _getByValue } = useCountries();

  const searchValue = params?.get("search");

  const locationLabel = useMemo(() => {
    if (searchValue) {
      return searchValue;
    }

    return "Rechercher un bien";
  }, [searchValue]);

  const durationLabel = useMemo(() => {
    return "Nom, ville ou description";
  }, []);

  const guestLabel = useMemo(() => {
    return "Mot-cle";
  }, []);

  return (
    <div
      onClick={searchModal.onOpen}
      className="
        border-[1px]
        w-full
        md:w-auto
        py-2  
        rounded-full
        shadow-sm
        hover:shadow-md
        transition
        cursor-pointer
      "
    >
      <div
        className="
          flex
          flex-row
          items-center
          justify-between
        "
      >
        <div
          className="
            text-sm
            font-semibold
            px-6
          "
        >
          {locationLabel}
        </div>
        <div
          className="
            hidden
            sm:block
            text-sm
            font-semibold
            px-6
            border-x-[1px]
            flex-1
            text-center
          "
        >
          {durationLabel}
        </div>
        <div
          className="
            text-sm
            pl-6
            pr-2
            text-gray-600
            flex
            flex-row
            items-center
            gap-3
          "
        >
          <div className="hidden sm:block">{guestLabel}</div>
          <div
            className="
              p-2
              bg-rose-500
              rounded-full
              text-white
            "
          >
            <BiSearch size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
