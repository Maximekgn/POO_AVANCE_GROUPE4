"use client";

import { ChangeEvent, useCallback, useRef } from "react";
import { TbPhotoPlus } from "react-icons/tb";
import Image from "next/image";
import toast from "react-hot-toast";

interface ImageUploadProps {
  onChange: (value: string[]) => void;
  value: string[];
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onChange, value }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onOpenLocalPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onLocalFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);

      if (selectedFiles.length === 0) {
        return;
      }

      const nonImageFile = selectedFiles.find(
        (file) => !file.type.startsWith("image/"),
      );
      if (nonImageFile) {
        toast.error("Tous les fichiers doivent etre des images.");
        event.target.value = "";
        return;
      }

      try {
        const imageReads = selectedFiles.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result !== "string") {
                  reject(new Error("format-invalide"));
                  return;
                }
                resolve(reader.result);
              };
              reader.onerror = () => reject(new Error("lecture-impossible"));
              reader.readAsDataURL(file);
            }),
        );

        const imageDataUrls = await Promise.all(imageReads);
        onChange([...(value || []), ...imageDataUrls]);
      } catch {
        toast.error("Erreur lors de la lecture des images.");
      }

      event.target.value = "";
    },
    [onChange, value],
  );

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onOpenLocalPicker}
        className="
          relative
          cursor-pointer
          hover:opacity-70
          transition
          border-dashed
          border-2
          p-20
          border-neutral-300
          flex
          flex-col
          justify-center
          items-center
          gap-4
          text-neutral-600
          w-full
        "
      >
        <TbPhotoPlus size={50} />
        <div className="font-semibold text-lg">
          Cliquez pour choisir une ou plusieurs photos
        </div>
        {value?.length > 0 && (
          <div className="absolute inset-0 w-full h-full">
            <Image
              alt="Uploaded image"
              fill
              sizes="100%"
              style={{ objectFit: "cover" }}
              src={value[0]}
            />
          </div>
        )}
      </button>
      {value?.length > 0 && (
        <p className="mt-2 text-sm text-neutral-600">
          {value.length} photo(s) selectionnee(s)
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onLocalFileChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
