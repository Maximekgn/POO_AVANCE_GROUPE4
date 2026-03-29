"use client";

import Container from "../Container";
import ListingCard from "./ListingCard";

interface ListingSectionProps {
  title: string;
  subtitle?: string;
  listings: any[];
}

const ListingSection: React.FC<ListingSectionProps> = ({
  title,
  subtitle,
  listings,
}) => {
  if (!listings || listings.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="flex flex-col mb-6">
        <h2 className="text-[23px] font-bold text-neutral-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm font-medium text-neutral-500">{subtitle}</p>
        )}
      </div>

      <div
        className="
        grid
        grid-cols-1
        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
        2xl:grid-cols-6
        gap-6
      "
      >
        {listings.slice(0, 12).map((listing) => (
          <ListingCard key={listing.id} data={listing} />
        ))}
      </div>

      <div className="mt-8 border-b border-neutral-100" />
    </div>
  );
};

export default ListingSection;
