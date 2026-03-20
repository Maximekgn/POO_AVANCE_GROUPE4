const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface IGetListingById {
  listingId?: string;
}

export default async function getListingById(params: IGetListingById) {
  try {
    const { listingId } = params;

    if (!listingId) {
      return null;
    }

    const response = await fetch(`${API_URL}/public/biens/${listingId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const bien = await response.json();

    const photoUrls = Array.isArray(bien.photos)
      ? bien.photos
          .map((photo: any) => photo?.url || photo?.image)
          .filter(
            (src: unknown): src is string =>
              typeof src === "string" && src.length > 0,
          )
      : [];

    const imageSources =
      photoUrls.length > 0 ? photoUrls : ["/placeholder-image.jpg"];

    const photoUrl = imageSources[0];
    const priceDaily = Number(bien.prix_jour || bien.loyer_hc || 0);
    const priceMonthly = Number(bien.prix_mois || bien.loyer_hc || 0);
    const roomCount = Number(bien.nb_pieces || 1);

    return {
      id: String(bien.id),
      title: bien.reference,
      description: bien.description || "",
      imageSrc: photoUrl,
      imageSources,
      locationValue: bien.ville,
      locationLabel: `${bien.adresse}, ${bien.ville}`,
      latitude:
        bien.latitude !== null && bien.latitude !== undefined
          ? Number(bien.latitude)
          : null,
      longitude:
        bien.longitude !== null && bien.longitude !== undefined
          ? Number(bien.longitude)
          : null,
      category: bien.sous_type_nom || bien.categorie_nom || "Bien",
      price: priceDaily,
      priceMonthly,
      roomCount,
      guestCount: Math.max(1, roomCount * 2),
      bathroomCount: Math.max(1, Math.ceil(roomCount / 2)),
      user: {
        name: "Proprietaire",
        image: null,
      },
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
