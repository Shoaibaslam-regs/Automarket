"use client";

import dynamic from "next/dynamic";

// The install-app banner and the push prompt show only after a delay, on phones, and only to some visitors, so
// their code loads after the page is interactive instead of in every page's first download.
const InstallBanner = dynamic(() => import("@/components/pwa/InstallBanner"), { ssr: false });
const PushPrompt = dynamic(() => import("@/components/pwa/PushCard").then(m => m.PushPrompt), { ssr: false });

export default function LazyPrompts({ pushClassName, install = true }: { pushClassName?: string; install?: boolean }) {
  return (
    <>
      {install && <InstallBanner />}
      <PushPrompt className={pushClassName} />
    </>
  );
}
