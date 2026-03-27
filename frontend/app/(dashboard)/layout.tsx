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
    <div className="min-h-screen flex flex-col md:flex-row gap-0 bg-blue-50/30">
      <ClientOnly>
        {/* Sidebar */}
        <div className="w-full md:w-80 md:h-screen md:sticky md:top-0  flex items-center justify-center">
          <AdminSidebar />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-h-screen">
          <main className="w-full h-full py-20 container mx-auto pr-10 bg-white rounded-lg shadow-md p-6 m-6">
            {children}
          </main>
        </div>
      </ClientOnly>
    </div>
  );
}
