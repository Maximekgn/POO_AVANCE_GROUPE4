import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import PropertiesClient from "./PropertiesClient";
import getProperties from "../actions/getProperties";

export const dynamic = "force-dynamic";

const PropertiesPage = async () => {
  const currentUser = await getCurrentUser();
  const listings = await getProperties();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState
          title="Unauthenticated User"
          subtitle="You can log in at the top right of the page."
        />
      </ClientOnly>
    );
  }

  if (listings.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No Properties found"
          subtitle="Looks like you don't have any properties yet."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <PropertiesClient listings={listings} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default PropertiesPage;
