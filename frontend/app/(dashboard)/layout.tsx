import AdminSidebar from "@/app/(dashboard)/admin/dashboard/components/AdminSidebar";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser?.isAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row gap-0">
      <ClientOnly>
        {/* Sidebar */}
        <div className="w-full md:w-80 md:h-screen md:sticky md:top-0 p-6 flex items-center justify-center">
          <AdminSidebar />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-h-screen">
          <main className="w-full h-full">
            {children}
          </main>
        </div>
      </ClientOnly>
    </div>
  );
}
