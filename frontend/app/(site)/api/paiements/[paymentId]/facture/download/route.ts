import { NextResponse } from "next/server";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface IParams {
  paymentId?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.accessToken) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const { paymentId } = await params;
  if (!paymentId || typeof paymentId !== "string") {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  const backendResponse = await fetch(
    `${API_URL}/paiements/${paymentId}/facture/download`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentUser.accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!backendResponse.ok) {
    const payload = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(
      {
        error: payload?.detail || "Impossible de telecharger la facture.",
        backendErrors: payload,
      },
      { status: backendResponse.status },
    );
  }

  const pdfArrayBuffer = await backendResponse.arrayBuffer();
  const contentType =
    backendResponse.headers.get("content-type") || "application/pdf";
  const contentDisposition =
    backendResponse.headers.get("content-disposition") ||
    `attachment; filename=\"Facture_${paymentId}.pdf\"`;

  return new NextResponse(pdfArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Cache-Control": "no-store",
    },
  });
}
