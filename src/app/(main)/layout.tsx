import Navbar from "@/components/Navbar";
import CompareBar from "@/components/listings/CompareBar";
import InstallBanner from "@/components/pwa/InstallBanner";

// One Navbar instance for every page in this group (including the home page), so it never
// duplicates during client-side navigation.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <CompareBar />
      <InstallBanner />
    </>
  );
}
