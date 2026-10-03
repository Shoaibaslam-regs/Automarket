import type { Metadata } from "next";
import BusinessSidebar from "@/components/business/BusinessSidebar";

export const metadata: Metadata = {
  title: "AutoMarket Business",
  description: "Manage your automobile business",
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .biz-root {
          display: flex;
          min-height: 100vh;
          background: #f6f8fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .biz-content {
          flex: 1;
          overflow-y: auto;
          min-width: 0;
        }
        @media (max-width: 768px) {
          .biz-content {
            padding-top: 56px;
          }
        }
      `}</style>
      <div className="biz-root">
        <BusinessSidebar />
        <div className="biz-content">
          {children}
        </div>
      </div>
    </>
  );
}
