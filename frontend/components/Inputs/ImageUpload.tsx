"use client";

import { ChangeEvent, useCallback, useRef } from "react";
import { TbPhotoPlus, TbX } from "react-icons/tb";
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

  const removeImage = useCallback(
    (indexToRemove: number) => {
      onChange(value.filter((_, index) => index !== indexToRemove));
    },
    [onChange, value],
  );

  const setAsMain = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newImages = [...value];
      const [removed] = newImages.splice(index, 1);
      newImages.unshift(removed);
      onChange(newImages);
    },
    [onChange, value],
  );

  return (
    <div className="w-full flex flex-col gap-4">
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
          rounded-lg
        "
      >
        <TbPhotoPlus size={50} />
        <div className="font-semibold text-lg">
          Cliquez pour choisir une ou plusieurs photos
        </div>
      </button>

      {value?.length > 0 && (
        <>
          <div className="text-sm font-medium text-neutral-700">
            {value.length} photo(s) selectionnee(s) - La premiere image sera la
            principale
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {value.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square group rounded-lg overflow-hidden border-2 border-neutral-200 hover:border-blue-400 transition-colors"
              >
                <Image
                  alt={`Uploaded image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  style={{ objectFit: "cover" }}
                  src={image}
                  className="transition-transform group-hover:scale-105"
                />

                {index === 0 && (
                  <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-md font-medium shadow-sm">
                    Principale
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => setAsMain(index)}
                      className="bg-white/90 hover:bg-white text-neutral-700 hover:text-blue-600 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      title="Définir comme principale"
                    >
                      Principale
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-full transition-colors"
                    title="Supprimer"
                  >
                    <TbX size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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
