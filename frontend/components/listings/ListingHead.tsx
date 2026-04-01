"use client";

import useCountries from "@/app/(site)/hooks/useCountries";
import Heading from "../Heading";
import Image from "next/image";
import { useMemo, useState, useCallback } from "react";

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
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      parsedUrl.hostname,
    );
  } catch {
    return false;
  }
}

interface IListingHeadProps {
  title: string;
  locationValue: string;
  locationLabel?: string;
  imageSrc: string;
  imageSources?: string[];
  id: string;
  currentUser?: any;
}

const ListingHead: React.FC<IListingHeadProps> = ({
  title,
  locationValue,
  locationLabel,
  imageSrc,
  imageSources,
  id,
  currentUser,
}) => {
  const { getByValue } = useCountries();

  const galleryImages = useMemo(() => {
    const safeList = (imageSources || []).map(getSafeImageSrc).filter(Boolean);
    return safeList.length > 0 ? safeList : [getSafeImageSrc(imageSrc)];
  }, [imageSources, imageSrc]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const selectedImage =
    galleryImages[selectedIndex] || "/placeholder-image.jpg";
  const selectedImageIsLocal = isLocalDevImage(selectedImage);

  const location = getByValue(locationValue);
  const subtitle =
    locationLabel ||
    (location ? `${location.region}, ${location.label}` : locationValue);

  const handlePrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedIndex(
        (i) => (i - 1 + galleryImages.length) % galleryImages.length,
      );
    },
    [galleryImages.length],
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedIndex((i) => (i + 1) % galleryImages.length);
    },
    [galleryImages.length],
  );

  // Grid layout: 1 big left + up to 4 right (Airbnb style)
  const mainImage = galleryImages[0];
  const sideImages = galleryImages.slice(1, 5);

  return (
    <>
      {/* Title + subtitle */}
      <Heading title={title} subtitle={subtitle} />

      {/* ── Photo grid ── */}
      <div className="relative mt-4 rounded-2xl overflow-hidden">
        {galleryImages.length === 1 ? (
          /* Single image – full width */
          <div
            className="relative h-[55vh] w-full cursor-pointer"
            onClick={() => setIsGalleryOpen(true)}
          >
            <Image
              alt={title}
              src={mainImage}
              fill
              sizes="100vw"
              priority
              unoptimized={isLocalDevImage(mainImage)}
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          /* Airbnb 2-column grid */
          <div
            className={`grid gap-2 h-[55vh] transition-all duration-300 ${
              sideImages.length >= 2 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {/* Main (left) */}
            <div
              className={`relative overflow-hidden cursor-pointer group ${
                sideImages.length >= 2 ? "" : "col-span-1"
              }`}
              onClick={() => {
                setSelectedIndex(0);
                setIsGalleryOpen(true);
              }}
            >
              <Image
                alt={title}
                src={mainImage}
                fill
                sizes="50vw"
                priority
                unoptimized={isLocalDevImage(mainImage)}
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Right grid */}
            {sideImages.length > 0 && (
              <div
                className={`grid gap-2 ${
                  sideImages.length === 1
                    ? "grid-rows-1"
                    : sideImages.length <= 2
                      ? "grid-rows-2"
                      : "grid-rows-2 grid-cols-2"
                }`}
              >
                {sideImages.map((src, idx) => {
                  const realIndex = idx + 1;
                  const isLast = idx === 3 && galleryImages.length > 5;
                  return (
                    <div
                      key={`${src}-${idx}`}
                      className="relative overflow-hidden cursor-pointer group"
                      onClick={() => {
                        setSelectedIndex(realIndex);
                        setIsGalleryOpen(true);
                      }}
                    >
                      <Image
                        alt={`Photo ${realIndex + 1}`}
                        src={src}
                        fill
                        sizes="25vw"
                        unoptimized={isLocalDevImage(src)}
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {isLast && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="text-white font-bold text-lg drop-shadow-md">
                            +{galleryImages.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* "Show all photos" button – bottom right */}
        {galleryImages.length > 1 && (
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="
              absolute bottom-4 right-6 z-20
              flex items-center gap-2
              rounded-xl border border-neutral-900 bg-white
              px-5 py-2.5 text-sm font-bold text-neutral-900
              shadow-lg
              hover:bg-neutral-50 hover:shadow-xl
              active:scale-95
              transition-all duration-200
            "
          >
            <svg
              viewBox="0 0 16 16"
              className="w-3.5 h-3.5"
              fill="currentColor"
            >
              <path d="M5 2a1 1 0 100-2 1 1 0 000 2zM2 5a1 1 0 110-2 1 1 0 010 2zm1 3a1 1 0 100-2 1 1 0 000 2zm-1 3a1 1 0 110-2 1 1 0 010 2zm1 3a1 1 0 100-2 1 1 0 000 2zm9-12a1 1 0 100-2 1 1 0 000 2zm2 3a1 1 0 110-2 1 1 0 010 2zm-1 3a1 1 0 100-2 1 1 0 000 2zm1 3a1 1 0 110-2 1 1 0 010 2zm-1 3a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            Toutes les photos
          </button>
        )}
      </div>

      {/* ── Fullscreen gallery modal ── */}
      {isGalleryOpen && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/95 flex flex-col"
          onClick={() => setIsGalleryOpen(false)}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsGalleryOpen(false)}
              className="
                flex items-center gap-2
                rounded-full border border-white/20
                px-4 py-2 text-sm font-medium text-white
                hover:bg-white/10 transition-colors
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                className="w-4 h-4"
              >
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
              Retour
            </button>
            <span className="text-sm text-white/60 font-medium tracking-wide">
              {selectedIndex + 1} <span className="text-white/30">/</span>{" "}
              {galleryImages.length}
            </span>
            <div className="w-24" />
          </div>

          {/* Main image with prev/next */}
          <div
            className="relative flex-1 min-h-0 mx-6 mb-4 overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              alt={`Photo ${selectedIndex + 1}`}
              src={selectedImage}
              fill
              sizes="100vw"
              priority
              unoptimized={selectedImageIsLocal}
              className="object-contain"
            />

            {/* Prev */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="
                  absolute left-4 top-1/2 -translate-y-1/2
                  w-10 h-10 rounded-full bg-white/90 shadow-lg
                  flex items-center justify-center
                  hover:bg-white transition-colors
                "
                aria-label="Photo précédente"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="w-5 h-5 text-neutral-800"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Next */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="
                  absolute right-4 top-1/2 -translate-y-1/2
                  w-10 h-10 rounded-full bg-white/90 shadow-lg
                  flex items-center justify-center
                  hover:bg-white transition-colors
                "
                aria-label="Photo suivante"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="w-5 h-5 text-neutral-800"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {galleryImages.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto px-6 pb-4 shrink-0 scrollbar-hide"
              onClick={(e) => e.stopPropagation()}
            >
              {galleryImages.map((src, index) => (
                <button
                  key={`thumb-${src}-${index}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`
                    relative h-16 w-24 shrink-0 overflow-hidden rounded-xl
                    border-2 transition-all duration-150
                    ${
                      selectedIndex === index
                        ? "border-white scale-105"
                        : "border-white/20 opacity-60 hover:opacity-90 hover:border-white/50"
                    }
                  `}
                  aria-label={`Photo ${index + 1}`}
                >
                  <Image
                    alt={`Miniature ${index + 1}`}
                    src={src}
                    fill
                    sizes="96px"
                    unoptimized={isLocalDevImage(src)}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ListingHead;
