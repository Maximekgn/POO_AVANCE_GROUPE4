import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function buildReference() {
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WEB-${Date.now()}-${randomSuffix}`;
}

function toPositiveNumber(value: unknown, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function toCoordinateDecimal(value: unknown): string | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  // Django expects DecimalField(max_digits=9, decimal_places=6): max 3 digits before decimal point.
  if (Math.abs(parsed) >= 1000) {
    return null;
  }

  return parsed.toFixed(6);
}

function extractBackendErrorMessage(payload: any): string {
  if (!payload) {
    return "Creation du bien impossible.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  const firstKey = Object.keys(payload)[0];
  if (!firstKey) {
    return "Creation du bien impossible.";
  }

  const firstValue = payload[firstKey];
  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return `${firstKey}: ${firstValue[0]}`;
  }

  if (typeof firstValue === "string") {
    return `${firstKey}: ${firstValue}`;
  }

  return "Creation du bien impossible.";
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mime = match[1];
  const base64 = match[2];
  const binary = Buffer.from(base64, "base64");
  const bytes = new Uint8Array(binary);
  return new File([bytes], filename, { type: mime });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(currentUser as any).accessToken) {
    return NextResponse.json({ message: "Non authentifie" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    imageSrc,
    category,
    roomCount,
    bathroomCount,
    guestCount,
    quartier,
    latitude,
    longitude,
    pricePerDay,
    pricePerMonth,
    adresse,
    ville,
    code_postal,
    superficie,
    meuble,
    etage,
    nb_pieces,
    loyer_hc,
    charges,
    depot_garantie,
  } = body;

  const parsedDaily = toPositiveNumber(pricePerDay, 1);
  const parsedMonthly = toPositiveNumber(pricePerMonth, parsedDaily * 30);
  const fallbackMonthly = parsedMonthly;
  const normalizedLatitude = toCoordinateDecimal(latitude);
  const normalizedLongitude = toCoordinateDecimal(longitude);

  const token = (currentUser as any).accessToken as string;

  const backendPayload = {
    reference: buildReference(),
    categorie: Number(category) || null,
    adresse: adresse || quartier?.label || title || "Adresse non precisee",
    quartier: quartier?.label || "Quartier non precise",
    ville: ville || quartier?.city || "Lome",
    code_postal: code_postal || "00000",
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
    description: description || "",
    superficie: Number(superficie) || 1,
    nb_pieces: Number(nb_pieces) || toPositiveNumber(roomCount, 1),
    meuble: Boolean(meuble),
    etage: Number(etage) || 0,
    prix_jour: parsedDaily,
    prix_mois: parsedMonthly,
    loyer_hc: Number(loyer_hc) || fallbackMonthly,
    charges: Number(charges) || 0,
    depot_garantie: Number(depot_garantie) || 0,
  };

  const createResponse = await fetch(`${API_URL}/biens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(backendPayload),
  });

  const listing = await createResponse.json();

  if (!createResponse.ok) {
    return NextResponse.json(
      {
        message: extractBackendErrorMessage(listing),
        backendErrors: listing,
      },
      { status: createResponse.status },
    );
  }

  const images: string[] = Array.isArray(imageSrc)
    ? imageSrc.filter((item) => typeof item === "string" && item.length > 0)
    : typeof imageSrc === "string" && imageSrc.length > 0
      ? [imageSrc]
      : [];

  for (let index = 0; index < images.length; index += 1) {
    const src = images[index];
    const photoFormData = new FormData();
    const dataUrlFile = dataUrlToFile(
      src,
      `bien-${listing.id}-${index + 1}.jpg`,
    );

    if (dataUrlFile) {
      photoFormData.append("image", dataUrlFile);
    } else {
      photoFormData.append("url", src);
    }

    photoFormData.append("principale", index === 0 ? "true" : "false");
    photoFormData.append("ordre", String(index));

    await fetch(`${API_URL}/biens/${listing.id}/photos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: photoFormData,
    });
  }

  return NextResponse.json(listing);
}
