// import Navbar from "@/components/Navbar";

// export default function MainLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <>
//       <Navbar />
//       <main>{children}</main>
//     </>
//   );
// }
"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideNavbarRoutes = ["/"];

  return (
    <>
      {!hideNavbarRoutes.includes(pathname) && <Navbar />}
      <main>{children}</main>
    </>
  );
}