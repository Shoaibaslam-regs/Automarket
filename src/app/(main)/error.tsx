"use client"; // Error boundaries must be Client Components

import ErrorState from "@/components/ErrorState";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorState error={error} retry={unstable_retry} homeHref="/home" />;
}
