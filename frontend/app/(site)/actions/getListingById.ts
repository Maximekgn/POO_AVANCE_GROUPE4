const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_BASE_URL = API_URL.replace(/\/api\/?$/, "");

function normalizePhotoSrc(src?: string): string {
  if (!src) {
    return "";
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (src.startsWith("/")) {
    return `${API_BASE_URL}${src}`;
  }

  return `${API_BASE_URL}/${src}`;
}

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
          .map((photo: any) => normalizePhotoSrc(photo?.url || photo?.image))
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
      avance: bien.avance || 0,
      
      // Nouveaux champs exposés
      superficie: bien.superficie,
      nb_salons: bien.nb_salons,
      nb_chambres: bien.nb_chambres,
      nb_douches: bien.nb_douches,
      caution_mois: bien.caution_mois,
      avance_mois: bien.avance_mois,
      frais_assistance: bien.frais_assistance,
      statut: bien.statut,

      ownerId: bien.owner_user_id, // This is the ID of the owner's utilisateur
      user: {
        name: bien.proprietaire_nom || "Propriétaire",
        image: null,
      },
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
