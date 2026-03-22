"use client";

import useCountries from "@/app/hooks/useCountries";
import Heading from "../Heading";
import Image from "next/image";
import HeartButton from "../HeartButton";
import { useMemo, useState } from "react";

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  "avatars.githubusercontent.com",
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
  "a0.muscache.com",
  "localhost",
  "127.0.0.1",
]);

function getSafeImageSrc(src?: string): string {
  if (!src) {
    return "/placeholder-image.jpg";
  }

  if (src.startsWith("/")) {
    return src;
  }

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

interface IListingHeadProps {
  title: string;
  locationValue: string;
  locationLabel?: string;
  imageSrc: string;
  imageSources?: string[];
  id: string;
  currentUser?: any | null;
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
    const safeList = (imageSources || [])
      .map((src) => getSafeImageSrc(src))
      .filter(Boolean);

    if (safeList.length > 0) {
      return safeList;
    }

    return [getSafeImageSrc(imageSrc)];
  }, [imageSources, imageSrc]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const selectedImage =
    galleryImages[selectedIndex] || "/placeholder-image.jpg";
  const selectedImageIsLocal = isLocalDevImage(selectedImage);

  const location = getByValue(locationValue);

  return (
    <>
      <Heading
        title={title}
        subtitle={
          locationLabel ||
          (location ? `${location.region}, ${location.label}` : locationValue)
        }
      />
      <div
        className="
          w-full
          h-[60vh]
          overflow-hidden
          rounded-xl
          relative
        "
      >
        <button
          type="button"
          onClick={() => setIsGalleryOpen(true)}
          className="absolute inset-0 z-10"
          aria-label="Voir toutes les photos"
        />
        <Image
          alt="Image"
          src={selectedImage}
          fill
          sizes="100%"
          unoptimized={selectedImageIsLocal}
          className="object-cover w-full"
        />
        {galleryImages.length > 1 && (
          <div className="absolute left-4 right-20 bottom-4 z-20">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(index);
                  }}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    selectedIndex === index
                      ? "border-white"
                      : "border-transparent opacity-85 hover:opacity-100"
                  }`}
                  aria-label={`Afficher la photo ${index + 1}`}
                >
                  <Image
                    alt={`Photo ${index + 1}`}
                    src={src}
                    fill
                    sizes="80px"
                    unoptimized={isLocalDevImage(src)}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
        {galleryImages.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsGalleryOpen(true);
            }}
            className="absolute bottom-4 right-4 z-20 rounded-lg bg-white/95 px-3 py-2 text-sm font-medium text-neutral-800 shadow hover:bg-white"
          >
            Voir toutes les photos
          </button>
        )}
        <div className="absolute top-5 right-5">
          <HeartButton listingId={id} currentUser={currentUser} />
        </div>
      </div>
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 md:p-8">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
            <div className="mb-4 flex items-center justify-between text-white">
              <p className="text-sm md:text-base">
                {selectedIndex + 1} / {galleryImages.length}
              </p>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="rounded-md border border-white/30 px-3 py-2 text-sm hover:bg-white/10"
              >
                Fermer
              </button>
            </div>

            <div className="relative mb-4 min-h-0 flex-1 overflow-hidden rounded-xl">
              <Image
                alt={`Photo ${selectedIndex + 1}`}
                src={selectedImage}
                fill
                sizes="100vw"
                unoptimized={selectedImageIsLocal}
                className="object-contain"
              />
            </div>

            {galleryImages.length > 1 && (
              <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-2 md:grid-cols-6">
                {galleryImages.map((src, index) => (
                  <button
                    key={`modal-${src}-${index}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`relative h-20 overflow-hidden rounded-lg border-2 ${
                      selectedIndex === index
                        ? "border-white"
                        : "border-white/20 opacity-80 hover:opacity-100"
                    }`}
                    aria-label={`Ouvrir la photo ${index + 1}`}
                  >
                    <Image
                      alt={`Miniature ${index + 1}`}
                      src={src}
                      fill
                      sizes="160px"
                      unoptimized={isLocalDevImage(src)}
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ListingHead;
