"use client";

import useCountries from "@/app/hooks/useCountries";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import ListingCategory from "./ListingCategory";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../Map"), {
  ssr: false,
});

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
    | {
        label: string;
        icon: IconType;
        description: string;
      }
    | undefined;
}

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
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined
      ? [latitude, longitude]
      : fallbackCoordinates;

  return (
    <div className="col-span-4 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div
          className="
            text-xl
            font-semibold
            flex
            flex-row
            items-center
            gap-2
          "
        >
          <div>Hosted by {user?.name || "Proprietaire"}</div>
          <Avatar src={user?.image} />
        </div>
        <div
          className="
            flex
            flex-row
            items-center
            gap-4
            font-light
            text-neutral-500
          "
        >
          <div>{guestCount} guests</div>
          <div>{roomCount} rooms</div>
          <div>{bathroomCount} bathrooms</div>
        </div>
      </div>
      <hr />
      {category && (
        <ListingCategory
          icon={category.icon}
          label={category.label}
          description={category.description}
        />
      )}
      <hr />
      <div className="text-lg font-light text-neutral-500">{description}</div>
      <hr />
      {locationLabel && (
        <div className="text-sm text-neutral-500">{locationLabel}</div>
      )}
      {locationLabel && <hr />}
      <Map center={coordinates} />
    </div>
  );
};

export default ListingInfo;
