import Link from "next/link";
import { redirect } from "next/navigation";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";
import Container from "@/components/Container";
import {
  getMyProfile,
  updateMyProfile,
  uploadMyIdentityDocument,
} from "@/app/(site)/actions/profileActions";

export const dynamic = "force-dynamic";

type SearchParams = {
  tab?: string;
  status?: string;
};

const tabs = [
  { key: "general", label: "General" },
  { key: "papers", label: "Papiers" },
  { key: "finance", label: "Finances" },
];

function fullName(profile: any) {
  const name =
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
  return name || profile?.email || "Utilisateur";
}

function avatarUrl(profile: any) {
  if (profile?.photo_profil) return profile.photo_profil;
  const seed = encodeURIComponent(fullName(profile));
  return `https://ui-avatars.com/api/?name=${seed}&background=0D8ABC&color=fff`;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/");
  }

  const params = await searchParams;
  const activeTab = tabs.some((tab) => tab.key === params.tab)
    ? params.tab
    : "general";

  const profile = await getMyProfile();

  if (!profile) {
    return (
      <Container>
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <Heading
            title="Profil indisponible"
            subtitle="Impossible de charger vos informations pour le moment."
          />
        </section>
      </Container>
    );
  }

  async function handleProfileUpdate(formData: FormData) {
    "use server";

    const payload = {
      first_name: (formData.get("first_name") || "").toString().trim(),
      last_name: (formData.get("last_name") || "").toString().trim(),
      telephone: (formData.get("telephone") || "").toString().trim(),
      photo_profil: (formData.get("photo_profil") || "").toString().trim(),
      profession: (formData.get("profession") || "").toString().trim(),
      revenus_mensuels: (formData.get("revenus_mensuels") || "")
        .toString()
        .trim(),
      numero_piece_client: (formData.get("numero_piece_client") || "")
        .toString()
        .trim(),
      iban: (formData.get("iban") || "").toString().trim(),
      adresse_fiscale: (formData.get("adresse_fiscale") || "")
        .toString()
        .trim(),
      numero_piece_proprietaire: (
        formData.get("numero_piece_proprietaire") || ""
      )
        .toString()
        .trim(),
    };

    const result = await updateMyProfile(payload);
    if (result.error) {
      redirect(`/profile?tab=general&status=${encodeURIComponent("error")}`);
    }

    redirect(`/profile?tab=general&status=${encodeURIComponent("saved")}`);
  }

  async function handleDocumentUpload(formData: FormData) {
    "use server";

    // Only append non-empty fields to avoid DRF validation errors
    const cleanFormData = new FormData();
    const numeropiece = (formData.get("numero_piece") || "").toString().trim();
    const profession = (formData.get("profession") || "").toString().trim();
    const revenusMensuels = (formData.get("revenus_mensuels") || "")
      .toString()
      .trim();
    const pieceIdentite = formData.get("piece_identite") as File;

    // Always required
    cleanFormData.append("numero_piece", numeropiece);
    cleanFormData.append("piece_identite", pieceIdentite);

    // Optional fields - only append if non-empty
    if (profession) {
      cleanFormData.append("profession", profession);
    }
    if (revenusMensuels) {
      cleanFormData.append("revenus_mensuels", revenusMensuels);
    }

    const result = await uploadMyIdentityDocument(cleanFormData);
    if (result.error) {
      redirect(`/profile?tab=papers&status=${encodeURIComponent("doc-error")}`);
    }
    redirect(`/profile?tab=papers&status=${encodeURIComponent("doc-saved")}`);
  }

  const statusText =
    params.status === "saved"
      ? "Profil mis a jour avec succes."
      : params.status === "doc-saved"
        ? "Document enregistre avec succes."
        : params.status === "error"
          ? "Echec de la mise a jour du profil."
          : params.status === "doc-error"
            ? "Echec de l'enregistrement du document."
            : "";

  return (
    <Container>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={avatarUrl(profile)}
                alt="Photo de profil"
                className="h-20 w-20 rounded-full border border-neutral-200 object-cover"
              />
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900">
                  {fullName(profile)}
                </h1>
                <p className="text-sm text-neutral-500">{profile.email}</p>
                <p className="text-sm text-neutral-500">
                  Email verifie: {profile.email_verifie ? "Oui" : "Non"}
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Retour accueil
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/profile?tab=${tab.key}`}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === tab.key
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {statusText ? (
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            {statusText}
          </p>
        ) : null}

        {activeTab === "general" && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <Heading
              title="Informations generales"
              subtitle="Modifiez vos donnees personnelles, client et proprietaire."
            />

            <form
              action={handleProfileUpdate}
              className="mt-5 grid grid-cols-1 gap-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  name="first_name"
                  defaultValue={profile.first_name || ""}
                  placeholder="Prenom"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
                <input
                  name="last_name"
                  defaultValue={profile.last_name || ""}
                  placeholder="Nom"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  name="telephone"
                  defaultValue={profile.telephone || ""}
                  placeholder="Telephone"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
                <input
                  name="photo_profil"
                  defaultValue={profile.photo_profil || ""}
                  placeholder="URL photo de profil"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input
                  name="profession"
                  defaultValue={profile.client_info?.profession || ""}
                  placeholder="Profession"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
                <input
                  name="revenus_mensuels"
                  defaultValue={profile.client_info?.revenus_mensuels || ""}
                  placeholder="Revenus mensuels"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
                <input
                  name="numero_piece_client"
                  defaultValue={profile.client_info?.numero_piece || ""}
                  placeholder="Numero piece (client)"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input
                  name="iban"
                  defaultValue={profile.proprietaire_info?.iban || ""}
                  placeholder="IBAN"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
                <input
                  name="adresse_fiscale"
                  defaultValue={
                    profile.proprietaire_info?.adresse_fiscale || ""
                  }
                  placeholder="Adresse fiscale"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
                <input
                  name="numero_piece_proprietaire"
                  defaultValue={profile.proprietaire_info?.numero_piece || ""}
                  placeholder="Numero piece (proprietaire)"
                  className="rounded-lg border border-neutral-300 px-4 py-3"
                />
              </div>

              <button
                type="submit"
                className="mt-2 rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Enregistrer les modifications
              </button>
            </form>
          </section>
        )}

        {activeTab === "papers" && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <Heading
              title="Papiers"
              subtitle="Ajoutez ou remplacez votre piece d'identite."
            />

            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              <p>
                Document actuel:{" "}
                {profile.client_info?.carte_identite?.nom || "Aucun"}
              </p>
            </div>

            <form
              action={handleDocumentUpload}
              className="mt-5 grid grid-cols-1 gap-4"
            >
              <input
                name="numero_piece"
                defaultValue={profile.client_info?.numero_piece || ""}
                placeholder="Numero de piece"
                className="rounded-lg border border-neutral-300 px-4 py-3"
                required
              />
              <input
                name="profession"
                defaultValue={profile.client_info?.profession || ""}
                placeholder="Profession (optionnel)"
                className="rounded-lg border border-neutral-300 px-4 py-3"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                name="revenus_mensuels"
                defaultValue={profile.client_info?.revenus_mensuels || ""}
                placeholder="Revenus mensuels (optionnel)"
                className="rounded-lg border border-neutral-300 px-4 py-3"
              />
              <input
                type="file"
                name="piece_identite"
                className="rounded-lg border border-neutral-300 px-4 py-3"
                required
              />

              <button
                type="submit"
                className="rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Enregistrer le document
              </button>
            </form>
          </section>
        )}

        {activeTab === "finance" && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <Heading
              title="Finances"
              subtitle="Vue rapide de vos donnees de revenus et informations bancaires."
            />
            <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase text-neutral-500">
                  Revenus mensuels
                </dt>
                <dd className="mt-1 text-sm text-neutral-900">
                  {profile.client_info?.revenus_mensuels || "-"}
                </dd>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase text-neutral-500">IBAN</dt>
                <dd className="mt-1 text-sm text-neutral-900">
                  {profile.proprietaire_info?.iban || "-"}
                </dd>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase text-neutral-500">
                  Adresse fiscale
                </dt>
                <dd className="mt-1 text-sm text-neutral-900">
                  {profile.proprietaire_info?.adresse_fiscale || "-"}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </Container>
  );
}
