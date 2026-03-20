const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface IListingParams {
  userId?: string;
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  category?: string;
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
      locationValue,
      category,
    } = params;

    const query = new URLSearchParams();
    if (category) {
      query.append("categorie", category);
    }
    if (locationValue) {
      query.append("ville", locationValue);
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
      const photoUrl =
        firstPhoto?.url || firstPhoto?.image || "/placeholder-image.jpg";

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
