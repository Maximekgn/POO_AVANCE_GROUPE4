"use client";

import useRentModal from "@/app/hooks/useRentModal";
import Modal from "./Modal";
import { useState, useEffect, useMemo } from "react";
import Heading from "../Heading";
import { TbBeach } from "react-icons/tb";
import getCategories, { Category } from "../../actions/getCategories";
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
import { QuartierOption, TOGO_QUARTIERS } from "@/app/libs/togoQuartiers";

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
    if (
      step === STEPS.IMAGES &&
      (!Array.isArray(data.imageSrc) || data.imageSrc.length === 0)
    ) {
      toast.error("Ajoutez au moins une photo pour continuer.");
      return;
    }

    if (step !== STEPS.PRICE) {
      return onNext();
    }

    setIsLoading(true);

    if (!data.latitude || !data.longitude) {
      toast.error(
        "Choisissez une position sur la carte ou utilisez votre position actuelle.",
      );
      setIsLoading(false);
      return;
    }

    axios
      .post("/api/listings", data)
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
      return "Publish";
    }

    return "Next";
  }, [step]);

  const secondaryActionLabel = useMemo(() => {
    if (step === STEPS.CATEGORY) {
      return undefined;
    }

    return "Back";
  }, [step]);

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  let bodyContent = (
    <div className="flex flex-col gap-4">
      <Heading
        title="Which category best describes your place?"
        subtitle="You can change this later"
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
              icon={TbBeach} // TODO: map icon dynamically if needed
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
      <div className="flex flex-col gap-8">
        <Heading
          title="Share some details about your place"
          subtitle="You can always change this later"
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
        />
      </div>
    );
  }

  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Upload some photos of your place"
          subtitle="You can always add more later"
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
          title="Describe your place to guests"
          subtitle="You can always edit this later"
        />
        <Input
          id="title"
          label="Title"
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
      <div className="flex flex-col gap-8">
        <Heading
          title="Définissez vos tarifs"
          subtitle="Indiquez le prix par jour et le prix par mois"
        />
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
      title="Airbnb your home"
      body={bodyContent}
    />
  );
};

export default RentModal;
