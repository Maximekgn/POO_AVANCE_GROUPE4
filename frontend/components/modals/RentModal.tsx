"use client";

import useRentModal from "@/app/(site)/hooks/useRentModal";
import Modal from "./Modal";
import { useState, useEffect, useMemo } from "react";
import Heading from "../Heading";
import { TbBeach } from "react-icons/tb";
import getCategories, { Category } from "@/app/(site)/actions/getCategories";
import CategoryInput from "../Inputs/CategoryInput";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import Counter from "../Inputs/Counter";
import ImageUpload from "../Inputs/ImageUpload";
import Input from "../Inputs/Input";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Select from "react-select";
import type { SingleValue } from "react-select";
import {
  QuartierOption,
  TOGO_QUARTIERS,
} from "@/app/(site)/libs/togoQuartiers";

enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  INFO = 2,
  IMAGES = 3,
  DESCRIPTION = 4,
  PRICE = 5,
}

const Map = dynamic(() => import("../Map"), { ssr: false });

const RentModal = () => {
  const rentModal = useRentModal();
  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FieldValues>({
    defaultValues: {
      category: null,
      quartier: null,
      latitude: null,
      longitude: null,
      guestCount: 1,
      roomCount: 1,
      bathroomCount: 1,
      imageSrc: [],
      pricePerDay: 1,
      pricePerMonth: 1,
      title: "",
      description: "",
      adresse: "",
      ville: "",
      code_postal: "",
      superficie: 0,
      meuble: false,
      etage: 0,
      nb_pieces: 0,
      nb_salons: 0,
      nb_chambres: 0,
      nb_douches: 0,
    },
  });

  const category = watch("category");
  const quartier = watch("quartier");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const guestCount = watch("guestCount");
  const roomCount = watch("roomCount");
  const bathroomCount = watch("bathroomCount");
  const imageSrc = watch("imageSrc") as string[];
  const adresse = watch("adresse");
  const ville = watch("ville");
  const code_postal = watch("code_postal");
  const superficie = watch("superficie");
  const meuble = watch("meuble");
  const etage = watch("etage");
  const nb_pieces = watch("nb_pieces");
  const nb_salons = watch("nb_salons");
  const nb_chambres = watch("nb_chambres");
  const nb_douches = watch("nb_douches");

  const getNearestQuartier = (lat: number, lng: number): QuartierOption => {
    return TOGO_QUARTIERS.reduce((nearest, current) => {
      const [nLat, nLng] = nearest.latlng;
      const [cLat, cLng] = current.latlng;

      const nearestDistanceSq = (lat - nLat) ** 2 + (lng - nLng) ** 2;
      const currentDistanceSq = (lat - cLat) ** 2 + (lng - cLng) ** 2;

      return currentDistanceSq < nearestDistanceSq ? current : nearest;
    });
  };

  const applyPosition = (lat: number, lng: number) => {
    setCustomValue("latitude", lat);
    setCustomValue("longitude", lng);

    const nearestQuartier = getNearestQuartier(lat, lng);
    setCustomValue("quartier", nearestQuartier);
  };

  const setCustomValue = (id: string, value: any) => {
    setValue(id, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const onBack = () => {
    setStep((prev) => prev - 1);
  };

  const onNext = () => {
    setStep((prev) => prev + 1);
  };

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    // Collect all data including potentially hidden fields
    const formData = {
      ...data,
      // Ensure specific fields are included if they were previously calculated or tracked
      guestCount: data.guestCount || 1,
      roomCount: data.roomCount || 1,
      bathroomCount: data.bathroomCount || 1,
    };

    if (
      step === STEPS.IMAGES &&
      (!Array.isArray(watch("imageSrc")) || watch("imageSrc").length === 0)
    ) {
      toast.error("Ajoutez au moins une photo pour continuer.");
      return;
    }

    if (step !== STEPS.PRICE) {
      return onNext();
    }

    setIsLoading(true);

    if (!watch("latitude") || !watch("longitude")) {
      toast.error(
        "Choisissez une position sur la carte ou utilisez votre position actuelle.",
      );
      setIsLoading(false);
      return;
    }

    axios
      .post("/api/listings", formData)
      .then(() => {
        toast.success("Listing created successfully");
        router.refresh();
        reset();
        setStep(STEPS.CATEGORY);
        rentModal.onClose();
      })
      .catch((error: any) => {
        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          (typeof error?.response?.data === "string"
            ? error.response.data
            : null);

        if (apiMessage) {
          toast.error(apiMessage);
          return;
        }

        toast.error("Something went wrong");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const actionLabel = useMemo(() => {
    if (step === STEPS.PRICE) {
      return "Soumettre";
    }

    return "Suivant";
  }, [step]);

  const secondaryActionLabel = useMemo(() => {
    if (step === STEPS.CATEGORY) {
      return undefined;
    }

    return "Retour";
  }, [step]);

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  let bodyContent = (
    <div className="flex flex-col gap-4">
      <Heading
        title="Quelle est la catégorie de votre bien ?"
        subtitle="Vous pourrez ajouter plus de détails ensuite, ne vous inquiétez pas."
      />
      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          lg:grid-cols-3
          gap-3
          max-h-[50vh]
          overflow-y-auto
        "
      >
        {categories.map((item) => (
          <div key={item.id} className="col-span-1">
            <CategoryInput
              onClick={() => setCustomValue("category", item.id)}
              selected={Number(category) === item.id}
              label={item.nom}
              imageSrc={item.image}
            />
          </div>
        ))}
      </div>
    </div>
  );

  if (step === STEPS.LOCATION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Choisissez un quartier togolais"
          subtitle="Cliquez ensuite sur la carte pour positionner précisément le bien"
        />
        <Select
          placeholder="Sélectionner un quartier"
          options={TOGO_QUARTIERS}
          value={quartier}
          onChange={(value: SingleValue<QuartierOption>) => {
            setCustomValue("quartier", value);
            if (value?.latlng) {
              applyPosition(value.latlng[0], value.latlng[1]);
            }
          }}
          formatOptionLabel={(option: QuartierOption) => (
            <div className="flex items-center justify-between">
              <span>{option.label}</span>
              <span className="text-sm text-neutral-500">{option.city}</span>
            </div>
          )}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            onClick={() => {
              if (!navigator.geolocation) {
                toast.error(
                  "La géolocalisation n'est pas disponible sur cet appareil.",
                );
                return;
              }

              navigator.geolocation.getCurrentPosition(
                (position) => {
                  applyPosition(
                    position.coords.latitude,
                    position.coords.longitude,
                  );
                  toast.success("Position actuelle appliquée.");
                },
                () => {
                  toast.error(
                    "Impossible de récupérer votre position actuelle.",
                  );
                },
              );
            }}
          >
            Utiliser ma position actuelle
          </button>
          <p className="self-center text-sm text-neutral-500">
            Vous pouvez aussi cliquer sur la carte pour ajuster.
          </p>
        </div>
        <Map
          center={
            latitude && longitude
              ? [Number(latitude), Number(longitude)]
              : quartier?.latlng
          }
          onSelectPosition={(latlng) => {
            applyPosition(latlng[0], latlng[1]);
          }}
        />
      </div>
    );
  }

  if (step === STEPS.INFO) {
    bodyContent = (
      <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2">
        <Heading
          title="Détails du bien"
          subtitle="Partagez plus d'informations sur la propriété"
        />
        <Input
          id="adresse"
          label="Adresse (Numéro et Rue)"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="ville"
            label="Ville"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
          />
          <Input
            id="code_postal"
            label="Code Postal"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
          />
        </div>
        <hr />
        <Counter
          title="Superficie (m²)"
          subtitle="Surface habitable (approximative)"
          value={superficie}
          onChange={(value) => setCustomValue("superficie", value)}
        />
        <hr />
        <Counter
          title="Nombre de pièces"
          subtitle="Total des pièces principales"
          value={nb_pieces}
          onChange={(value) => setCustomValue("nb_pieces", value)}
        />
        <hr />
        <Counter
          title="Étage"
          subtitle="Niveau de l'appartement (0 pour RDC)"
          value={etage}
          onChange={(value) => setCustomValue("etage", value)}
        />
        <hr />
        <Counter
          title="Salons"
          subtitle="Combien de salons comporte le bien ?"
          value={nb_salons}
          onChange={(value) => setCustomValue("nb_salons", value)}
        />
        <hr />
        <Counter
          title="Chambres"
          subtitle="Nombre de chambres à coucher"
          value={nb_chambres}
          onChange={(value) => setCustomValue("nb_chambres", value)}
        />
        <hr />
        <Counter
          title="Douches / Salles de bain"
          subtitle="Nombre de points d'eau et douches"
          value={nb_douches}
          onChange={(value) => setCustomValue("nb_douches", value)}
        />
        <hr />
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <div className="font-semibold">Meublé</div>
            <div className="font-light text-neutral-500">
              Le bien est-il loué avec des meubles ?
            </div>
          </div>
          <input
            type="checkbox"
            checked={meuble}
            onChange={(e) => setCustomValue("meuble", e.target.checked)}
            className="w-5 h-5 cursor-pointer accent-blue-500"
          />
        </div>
        <hr />
        {/* <Heading
          title="Anciens champs Airbnb (temporaire)"
          subtitle="Pour rétrocompatibilité"
        />
        <Counter
          title="Guests"
          subtitle="How many guests can your place accommodate?"
          value={guestCount}
          onChange={(value) => setCustomValue("guestCount", value)}
        />
        <hr />
        <Counter
          title="Rooms"
          subtitle="How many rooms can guests use?"
          value={roomCount}
          onChange={(value) => setCustomValue("roomCount", value)}
        />
        <hr />
        <Counter
          title="Bathrooms"
          subtitle="How many bathrooms can guests use?"
          value={bathroomCount}
          onChange={(value) => setCustomValue("bathroomCount", value)}
        /> */}
      </div>
    );
  }

  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Ajoutez des photos de votre bien"
          subtitle="Vous pouvez toujours ajouter d'autres photos plus tard"
        />
        <ImageUpload
          value={imageSrc}
          onChange={(value) => setCustomValue("imageSrc", value)}
        />
      </div>
    );
  }

  if (step === STEPS.DESCRIPTION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Decrivez votre bien"
          subtitle="Vous pouvez toujours modifier cette description plus tard"
        />
        <Input
          id="title"
          label="Titre"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <hr />
        <Input
          id="description"
          label="Description"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
    );
  }

  if (step === STEPS.PRICE) {
    bodyContent = (
      <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2">
        <Heading
          title="Définissez vos tarifs"
          subtitle="Indiquez le prix par jour et par mois"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="pricePerDay"
            label="Prix par jour (FCFA)"
            formatPrice
            type="number"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
          />
          <Input
            id="pricePerMonth"
            label="Prix par mois (FCFA)"
            formatPrice
            type="number"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
          />
        </div>
      </div>
    );
  }

  return (
    <Modal
      isOpen={rentModal.isOpen}
      onClose={rentModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      actionLabel={actionLabel}
      secondaryActionLabel={secondaryActionLabel}
      secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
      title="Miabe - Immo"
      body={bodyContent}
    />
  );
};

export default RentModal;
