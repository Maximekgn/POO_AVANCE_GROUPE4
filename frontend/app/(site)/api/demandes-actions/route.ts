import { NextResponse } from "next/server";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.accessToken) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "incoming";

  const backendPath =
    scope === "outgoing" ? "/demandes-actions" : "/demandes-actions/recues";

  const response = await fetch(`${API_URL}${backendPath}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${currentUser.accessToken}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => []);

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Impossible de recuperer les demandes.",
        backendErrors: payload,
      },
      { status: response.status },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
