import Link from "next/link";
import { notFound } from "next/navigation";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";
import AdminUserDetailClient from "./AdminUserDetailClient";

import {
  getAdminFinanceProfile,
  getAdminUserBiens,
  getAdminUserById,
  getAdminUserRentedBiens,
} from "../../lib/adminApi";

export const dynamic = "force-dynamic";

const tabs = [
  { key: "general", label: "General" },
  { key: "finances", label: "Finances" },
  { key: "papers", label: "Papiers" },
  { key: "biens", label: "Biens" },
];

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const fullName = (firstName?: string, lastName?: string, email?: string) => {
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  return name || email || "Sans nom";
};

const avatarUrl = (user: {
  photo_profil?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
}) => {
  if (user.photo_profil) return user.photo_profil;
  const seed = encodeURIComponent(
    fullName(user.first_name, user.last_name, user.email),
  );
  return `https://ui-avatars.com/api/?name=${seed}&background=0f766e&color=fff`;
};

const formatFcfa = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const canPreviewAsImage = (mimeType?: string | null) =>
  Boolean(mimeType && mimeType.startsWith("image/"));

const canPreviewAsPdf = (mimeType?: string | null, fileUrl?: string | null) =>
  Boolean(
    (mimeType && mimeType.includes("pdf")) ||
    (fileUrl && fileUrl.toLowerCase().includes(".pdf")),
  );

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: { userId: string } | Promise<{ userId: string }>;
  searchParams?: { tab?: string } | Promise<{ tab?: string }>;
}) {
  const { userId } = await Promise.resolve(params);
  const currentTabPayload = await Promise.resolve(searchParams || {});
  const tab = tabs.some((item) => item.key === currentTabPayload.tab)
    ? currentTabPayload.tab
    : "general";

  const parsedId = Number(userId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const accessToken = (currentUser as { accessToken?: string } | null)
    ?.accessToken;

  if (!accessToken) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <Heading
          title="Profil utilisateur indisponible"
          subtitle="Session invalide. Reconnectez-vous pour consulter ce detail."
        />
        <div className="mt-4">
          <Link
            href="/admin/dashboard/utilisateurs"
            className="inline-flex rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Retour au registre
          </Link>
        </div>
      </section>
    );
  }

  const user = await getAdminUserById(parsedId, currentUser || {});

  if (!user) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <Heading
          title="Profil utilisateur introuvable"
          subtitle="Le compte n'existe pas ou le service de detail est temporairement indisponible."
        />
        <div className="mt-4">
          <Link
            href="/admin/dashboard/utilisateurs"
            className="inline-flex rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Retour au registre
          </Link>
        </div>
      </section>
    );
  }

  const identityDoc =
    user.client_info?.carte_identite || user.proprietaire_info?.carte_identite;

  const financeProfile =
    tab === "finances" || tab === "general"
      ? await getAdminFinanceProfile(parsedId, currentUser || {})
      : null;

  const userBiens =
    tab === "biens" || tab === "general"
      ? await getAdminUserBiens(parsedId, currentUser || {})
      : [];

  const userRentedBiens =
    tab === "biens" || tab === "general"
      ? await getAdminUserRentedBiens(parsedId, currentUser || {})
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Heading
          title={`Fiche utilisateur #${user.id}`}
          subtitle="Vue admin avec sections general, finances, papiers et biens"
        />
        <div className="flex gap-2">
          <Link
            href={`/admin/dashboard/messages?conversation=${Math.min(
              Number(currentUser?.id || 0) || 0,
              Number(user.id) || 0,
            )}_${Math.max(
              Number(currentUser?.id || 0) || 0,
              Number(user.id) || 0,
            )}`}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition"
          >
            Envoyer un message
          </Link>
          <Link
            href="/admin/dashboard/utilisateurs"
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Retour au registre
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl(user)}
              alt="Photo profil"
              className="h-20 w-20 rounded-full border border-neutral-200 object-cover"
            />
            <div>
              <p className="text-xl font-semibold text-neutral-900">
                {fullName(user.first_name, user.last_name, user.email)}
              </p>
              <p className="text-sm text-neutral-500">{user.email}</p>
              <p className="text-sm text-neutral-500">@{user.username}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <span className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700">
              Role: {user.role}
            </span>
            <span className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700">
              Actif: {user.is_active ? "Oui" : "Non"}
            </span>
            <span className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700">
              Email verifie: {user.email_verifie ? "Oui" : "Non"}
            </span>
            <span className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700">
              Biens: {user.nombre_biens}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={`/admin/dashboard/utilisateurs/${user.id}?tab=${item.key}`}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === item.key
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {tab === "general" && (
        <div className="space-y-6">
          <AdminUserDetailClient
            user={user}
            accessToken={currentUser?.accessToken || ""}
          />
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">General</h2>
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Telephone
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {user.telephone || "-"}
                </dd>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Date creation
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {formatDate(user.date_creation || user.date_joined)}
                </dd>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Dernier login Django
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {formatDate(user.last_login)}
                </dd>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Dernier login applicatif
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {formatDate(user.dernier_login_custom)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                Donnees client
              </h2>
              {user.client_info ? (
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Profession
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {user.client_info.profession || "-"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Numero piece
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {user.client_info.numero_piece || "-"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Revenus mensuels
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {user.client_info.revenus_mensuels || "-"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">
                  Aucune donnee client enregistree.
                </p>
              )}
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                Donnees proprietaire
              </h2>
              {user.proprietaire_info ? (
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      IBAN
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {user.proprietaire_info.iban || "-"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Adresse fiscale
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {user.proprietaire_info.adresse_fiscale || "-"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Numero piece
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {user.proprietaire_info.numero_piece || "-"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">
                  Aucune donnee proprietaire enregistree.
                </p>
              )}
            </article>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">
              Papier d'identite
            </h2>
            {identityDoc ? (
              <div className="mt-4 space-y-3">
                {identityDoc.file_url &&
                  canPreviewAsImage(identityDoc.mime_type) ? (
                  <img
                    src={identityDoc.file_url}
                    alt={identityDoc.nom}
                    className="max-h-[28rem] w-full rounded-xl border border-neutral-200 object-contain"
                  />
                ) : null}
                {identityDoc.file_url &&
                  !canPreviewAsImage(identityDoc.mime_type) &&
                  canPreviewAsPdf(identityDoc.mime_type, identityDoc.file_url) ? (
                  <iframe
                    src={identityDoc.file_url}
                    title={identityDoc.nom}
                    className="h-[32rem] w-full rounded-xl border border-neutral-200"
                  />
                ) : null}
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Nom
                    </dt>
                    <dd className="mt-1 text-neutral-900">{identityDoc.nom}</dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Type
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {identityDoc.type}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Mime type
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {identityDoc.mime_type || "-"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      Date generation
                    </dt>
                    <dd className="mt-1 text-neutral-900">
                      {formatDate(identityDoc.date_generation)}
                    </dd>
                  </div>
                </dl>
                {identityDoc.file_url &&
                  !canPreviewAsImage(identityDoc.mime_type) &&
                  !canPreviewAsPdf(
                    identityDoc.mime_type,
                    identityDoc.file_url,
                  ) ? (
                  <a
                    href={identityDoc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    Ouvrir le document dans un nouvel onglet
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                Aucun document d'identite lie a ce compte.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">
              Loyers et situation
            </h2>
            {financeProfile ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs uppercase text-emerald-700">
                    Loyers percus (proprietaire)
                  </p>
                  <p className="mt-2 text-lg font-semibold text-emerald-800">
                    {formatFcfa(
                      Number(
                        financeProfile?.totals?.proprietaire_loyers_percus || 0,
                      ),
                    )}
                  </p>
                </article>
                <article className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs uppercase text-rose-700">
                    Loyers impayes (proprietaire)
                  </p>
                  <p className="mt-2 text-lg font-semibold text-rose-800">
                    {formatFcfa(
                      Number(
                        financeProfile?.totals?.proprietaire_loyers_impayes ||
                        0,
                      ),
                    )}
                  </p>
                </article>
                <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs uppercase text-amber-700">
                    Loyers a payer (locataire)
                  </p>
                  <p className="mt-2 text-lg font-semibold text-amber-800">
                    {formatFcfa(
                      Number(
                        financeProfile?.totals?.locataire_loyers_a_payer || 0,
                      ),
                    )}
                  </p>
                </article>
                <article className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs uppercase text-orange-700">
                    Loyers impayes (locataire)
                  </p>
                  <p className="mt-2 text-lg font-semibold text-orange-800">
                    {formatFcfa(
                      Number(
                        financeProfile?.totals?.locataire_loyers_impayes || 0,
                      ),
                    )}
                  </p>
                </article>
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                Donnees loyers indisponibles pour le moment.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">
              Biens possedes
            </h2>
            {userBiens.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">
                Aucun bien possede par cet utilisateur.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 text-left text-neutral-600">
                    <tr>
                      <th className="px-3 py-3">Reference</th>
                      <th className="px-3 py-3">Ville</th>
                      <th className="px-3 py-3">Quartier</th>
                      <th className="px-3 py-3">Statut</th>
                      <th className="px-3 py-3">Actif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userBiens.map((bien) => (
                      <tr key={bien.id} className="border-t border-neutral-100">
                        <td className="px-3 py-3">{bien.reference}</td>
                        <td className="px-3 py-3">{bien.ville}</td>
                        <td className="px-3 py-3">{bien.quartier || "-"}</td>
                        <td className="px-3 py-3">{bien.statut}</td>
                        <td className="px-3 py-3">
                          {bien.is_active ? "Oui" : "Non"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">
              Biens loues ou privatises
            </h2>
            {userRentedBiens.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">
                Aucun bien loue ou privatise par cet utilisateur.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 text-left text-neutral-600">
                    <tr>
                      <th className="px-3 py-3">Reference bien</th>
                      <th className="px-3 py-3">Ville</th>
                      <th className="px-3 py-3">Quartier</th>
                      <th className="px-3 py-3">Statut bail</th>
                      <th className="px-3 py-3">Loyer actuel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRentedBiens.map((entry) => (
                      <tr
                        key={entry.bail_id}
                        className="border-t border-neutral-100"
                      >
                        <td className="px-3 py-3">{entry.bien.reference}</td>
                        <td className="px-3 py-3">{entry.bien.ville}</td>
                        <td className="px-3 py-3">
                          {entry.bien.quartier || "-"}
                        </td>
                        <td className="px-3 py-3">{entry.bail_statut}</td>
                        <td className="px-3 py-3">
                          {formatFcfa(Number(entry.loyer_actuel || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "finances" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-neutral-900">Finances</h2>
          {financeProfile ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs uppercase text-emerald-700">
                    Loyers percus (proprietaire)
                  </p>
                  <p className="mt-2 text-lg font-semibold text-emerald-800">
                    {formatFcfa(
                      Number(
                        financeProfile.totals.proprietaire_loyers_percus || 0,
                      ),
                    )}
                  </p>
                </article>
                <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs uppercase text-amber-700">
                    Loyers impayes (proprietaire)
                  </p>
                  <p className="mt-2 text-lg font-semibold text-amber-800">
                    {formatFcfa(
                      Number(
                        financeProfile.totals.proprietaire_loyers_impayes || 0,
                      ),
                    )}
                  </p>
                </article>
                <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-xs uppercase text-indigo-700">
                    Loyers a payer (locataire)
                  </p>
                  <p className="mt-2 text-lg font-semibold text-indigo-800">
                    {formatFcfa(
                      Number(
                        financeProfile.totals.locataire_loyers_a_payer || 0,
                      ),
                    )}
                  </p>
                </article>
              </div>

              <div className="mt-5">
                <Link
                  href={`/admin/dashboard/finances/profils/${user.id}`}
                  className="inline-flex rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  Voir le profil financier detaille
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">
              Donnees financieres indisponibles pour le moment.
            </p>
          )}
        </section>
      )}

      {tab === "papers" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-neutral-900">Papiers</h2>
          {identityDoc ? (
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Nom
                </dt>
                <dd className="mt-1 text-neutral-900">{identityDoc.nom}</dd>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Type
                </dt>
                <dd className="mt-1 text-neutral-900">{identityDoc.type}</dd>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Mime type
                </dt>
                <dd className="mt-1 text-neutral-900">
                  {identityDoc.mime_type || "-"}
                </dd>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Date generation
                </dt>
                <dd className="mt-1 text-neutral-900">
                  {formatDate(identityDoc.date_generation)}
                </dd>
              </div>
              {identityDoc.file_url ? (
                <div className="sm:col-span-2 xl:col-span-4">
                  {canPreviewAsImage(identityDoc.mime_type) ? (
                    <img
                      src={identityDoc.file_url}
                      alt={identityDoc.nom}
                      className="max-h-[28rem] w-full rounded-xl border border-neutral-200 object-contain"
                    />
                  ) : null}
                  {!canPreviewAsImage(identityDoc.mime_type) &&
                    canPreviewAsPdf(
                      identityDoc.mime_type,
                      identityDoc.file_url,
                    ) ? (
                    <iframe
                      src={identityDoc.file_url}
                      title={identityDoc.nom}
                      className="h-[32rem] w-full rounded-xl border border-neutral-200"
                    />
                  ) : null}
                  {!canPreviewAsImage(identityDoc.mime_type) &&
                    !canPreviewAsPdf(
                      identityDoc.mime_type,
                      identityDoc.file_url,
                    ) ? (
                    <a
                      href={identityDoc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                    >
                      Ouvrir le document dans un nouvel onglet
                    </a>
                  ) : null}
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">
              Aucun document d'identite lie a ce compte.
            </p>
          )}
        </section>
      )}

      {tab === "biens" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-neutral-900">Biens</h2>
          {userBiens.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">
              Aucun bien rattache a cet utilisateur.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-neutral-600">
                  <tr>
                    <th className="px-3 py-3">Reference</th>
                    <th className="px-3 py-3">Ville</th>
                    <th className="px-3 py-3">Quartier</th>
                    <th className="px-3 py-3">Statut</th>
                    <th className="px-3 py-3">Actif</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userBiens.map((bien) => (
                    <tr key={bien.id} className="border-t border-neutral-100">
                      <td className="px-3 py-3">{bien.reference}</td>
                      <td className="px-3 py-3">{bien.ville}</td>
                      <td className="px-3 py-3">{bien.quartier || "-"}</td>
                      <td className="px-3 py-3">{bien.statut}</td>
                      <td className="px-3 py-3">
                        {bien.is_active ? "Oui" : "Non"}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/dashboard/biens/${bien.id}`}
                          className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="mt-6 text-base font-semibold text-neutral-900">
            Biens loues ou privatises
          </h3>
          {userRentedBiens.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              Aucun bien loue ou privatise par cet utilisateur.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-neutral-600">
                  <tr>
                    <th className="px-3 py-3">Reference bien</th>
                    <th className="px-3 py-3">Ville</th>
                    <th className="px-3 py-3">Quartier</th>
                    <th className="px-3 py-3">Statut bail</th>
                    <th className="px-3 py-3">Date entree</th>
                    <th className="px-3 py-3">Date sortie</th>
                    <th className="px-3 py-3">Loyer actuel</th>
                  </tr>
                </thead>
                <tbody>
                  {userRentedBiens.map((entry) => (
                    <tr
                      key={entry.bail_id}
                      className="border-t border-neutral-100"
                    >
                      <td className="px-3 py-3">{entry.bien.reference}</td>
                      <td className="px-3 py-3">{entry.bien.ville}</td>
                      <td className="px-3 py-3">
                        {entry.bien.quartier || "-"}
                      </td>
                      <td className="px-3 py-3">{entry.bail_statut}</td>
                      <td className="px-3 py-3">
                        {formatDate(entry.date_entree)}
                      </td>
                      <td className="px-3 py-3">
                        {formatDate(entry.date_sortie)}
                      </td>
                      <td className="px-3 py-3">
                        {formatFcfa(Number(entry.loyer_actuel || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
