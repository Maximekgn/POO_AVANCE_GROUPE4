const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_BASE_URL = API_URL.replace(/\/api\/?$/, "");

function normalizePhotoSrc(src?: string): string {
  if (!src) {
    return "/placeholder-image.jpg";
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (src.startsWith("/")) {
    return `${API_BASE_URL}${src}`;
  }

  return `${API_BASE_URL}/${src}`;
}

export interface IListingParams {
  userId?: string;
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  category?: string;
  search?: string;
}

export default async function getListings(params: IListingParams) {
  try {
    const {
      userId: _userId,
      guestCount: _guestCount,
      roomCount: _roomCount,
      bathroomCount: _bathroomCount,
      startDate: _startDate,
      endDate: _endDate,
      locationValue: _locationValue,
      category,
      search,
    } = params;

    const query = new URLSearchParams();
    if (category) {
      query.append("categorie", category);
    }
    if (search) {
      query.append("search", search);
    }

    const response = await fetch(
      `${API_URL}/public/biens?${query.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return [];
    }

    const biens = await response.json();
    if (!Array.isArray(biens)) {
      return [];
    }

    return biens.map((bien: any) => {
      const firstPhoto =
        Array.isArray(bien.photos) && bien.photos.length > 0
          ? bien.photos[0]
          : null;
      const photoUrl = normalizePhotoSrc(firstPhoto?.url || firstPhoto?.image);

      return {
        id: String(bien.id),
        title: bien.reference,
        description: bien.description,
        imageSrc: photoUrl,
        locationValue: bien.ville,
        category: bien.categorie_nom || bien.sous_type_nom || "Bien",
        price: Number(bien.prix_jour || bien.loyer_hc || 0),
        priceMonthly: Number(bien.prix_mois || bien.loyer_hc || 0),
      };
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}
