"use client";

import { IconType } from "react-icons";
import Image from "next/image";

interface CategoryInputProps {
  icon?: IconType;
  imageSrc?: string | null;
  label: string;
  selected: boolean;
  onClick: (value: string) => void;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

function getSafeImageSrc(src?: string | null): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
  return `${API_BASE_URL}/${src}`;
}

const CategoryInput: React.FC<CategoryInputProps> = ({
  icon: Icon,
  imageSrc,
  label,
  selected,
  onClick,
}) => {
  const resolvedImageSrc = getSafeImageSrc(imageSrc);

  return (
    <div
      onClick={() => onClick(label)}
      className={`
        rounded-2xl
        border-2
        p-4
        flex
        flex-col
        gap-3
        hover:border-neutral-900
        transition
        cursor-pointer
        ${selected ? "border-neutral-900 bg-neutral-50/50" : "border-neutral-300 bg-white"}
      `}
    >
      {resolvedImageSrc ? (
        <div className="relative w-8 h-8">
          <Image
            src={resolvedImageSrc}
            alt={label}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      ) : (
        Icon && <Icon size={32} className="text-neutral-600" />
      )}
      <div className={`text-sm font-bold ${selected ? "text-neutral-900" : "text-neutral-600"}`}>
        {label}
      </div>
    </div>
  );
};

export default CategoryInput;
