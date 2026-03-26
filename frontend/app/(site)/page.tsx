import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import getListings, { IListingParams } from "@/app/(site)/actions/getListings";
import getCategories from "@/app/(site)/actions/getCategories";
import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import ListingCard from "@/components/listings/ListingCard";
import ListingSection from "@/components/listings/ListingSection";

interface HomeProps {
  searchParams?: Promise<IListingParams>;
}

export const dynamic = "force-dynamic";

const Home = async ({ searchParams }: HomeProps) => {
  const resolvedSearchParams = (await searchParams) || {};
  const listings = await getListings(resolvedSearchParams);
  const categoriesData = await getCategories();
  const currentUser = await getCurrentUser();

  const isFiltered = !!(resolvedSearchParams.category || resolvedSearchParams.search || resolvedSearchParams.locationValue);

  if (listings.length === 0) {
    return (
      <ClientOnly>
        <EmptyState showReset />
      </ClientOnly>
    );
  }

  // If filtered, stick to the simple grid
  if (isFiltered) {
    return (
      <ClientOnly>
        <Container>
          <div
            className="
              pt-24
              grid
              grid-cols-1
              sm:grid-cols-2
              md:grid-cols-3
              lg:grid-cols-4
              xl:grid-cols-5
              2xl:grid-cols-6
              gap-8
            "
          >
            {listings.map((listing) => (
              <ListingCard
                currentUser={currentUser}
                key={listing.id}
                data={listing}
              />
            ))}
          </div>
        </Container>
      </ClientOnly>
    );
  }

  // If not filtered, show themed sections
  return (
    <ClientOnly>
      <Container>
        <div className="pt-24 flex flex-col gap-6">
          
          <ListingSection 
            title="Nos coups de cœur ❤️"
            subtitle="Les meilleures pépites sélectionnées par notre équipe"
            listings={listings.slice(0, 6)}
            currentUser={currentUser}
          />

          <ListingSection 
            title="Proche de chez vous 📍"
            subtitle="Découvrez les pépites dans votre zone actuelle"
            listings={listings.length > 12 ? listings.slice(12, 18) : listings.slice(0, 4)}
            currentUser={currentUser}
          />

          <ListingSection 
            title="Nouveautés ✨"
            subtitle="Les derniers biens ajoutés sur la plateforme"
            listings={listings.slice(listings.length > 6 ? 6 : 0, 12)}
            currentUser={currentUser}
          />

          <div className="pt-4 flex flex-col gap-2">
            <h2 className="text-[23px] font-bold text-neutral-900 tracking-tight pl-1">
              Par catégories
            </h2>
            {categoriesData.map((cat) => {
              const catListings = listings.filter(l => l.category === cat.nom);
              if (catListings.length === 0) return null;

              return (
                <ListingSection 
                  key={cat.id}
                  title={cat.nom}
                  subtitle={`Tous nos biens de type ${cat.nom.toLowerCase()}`}
                  listings={catListings}
                  currentUser={currentUser}
                />
              );
            })}
          </div>

        </div>
      </Container>
    </ClientOnly>
  );
};

export default Home;
