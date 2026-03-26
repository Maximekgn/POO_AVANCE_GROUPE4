"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { IconType } from "react-icons";
import qs from "query-string";

interface CategoryBoxProps {
  label: string;
  icon?: IconType;
  imageSrc?: string | null;
  value?: string | number;
  selected?: boolean;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

function getSafeImageSrc(src?: string | null): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
  return `${API_BASE_URL}/${src}`;
}

const CategoryBox: React.FC<CategoryBoxProps> = ({
  label,
  icon: Icon,
  imageSrc,
  value,
  selected = false,
}) => {
  const router = useRouter();
  const params = useSearchParams();

  const resolvedImageSrc = useMemo(() => getSafeImageSrc(imageSrc), [imageSrc]);

  const handleClick = useCallback(() => {
    let currentQuery = {};

    if (params) {
      currentQuery = qs.parse(params.toString());
    }

    const categoryValue = String(value ?? label);

    const updatedQuery: any = {
      ...currentQuery,
      category: categoryValue,
    };

    if (params?.get("category") === categoryValue) {
      delete updatedQuery.category;
    }

    const url = qs.stringifyUrl(
      {
        url: "/",
        query: updatedQuery,
      },
      { skipNull: true },
    );

    router.push(url);
  }, [label, params, router, value]);

  return (
    <div
      onClick={handleClick}
      className={`
      flex
      flex-col
      items-center
      justify-center
      gap-2
      p-3
      border-b-2
      hover:text-neutral-800
      transition
      cursor-pointer
      min-w-[90px]
      ${selected ? "text-neutral-800 " : "text-neutral-500 "}
      ${selected ? "border-b-neutral-800" : "border-transparent"}
      `}
    >
      {resolvedImageSrc ? (
        <div className="relative w-7 h-7">
          <Image
            src={resolvedImageSrc}
            alt={label}
            fill
            unoptimized
            className={`object-contain transition-opacity ${selected ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}
          />
        </div>
      ) : (
        Icon && <Icon size={26} />
      )}
      <div className="font-medium text-xs whitespace-nowrap">{label}</div>
    </div>
  );
};

export default CategoryBox;
