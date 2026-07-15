"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/shared";

/**
 * Pending hint for a list row. Must render inside a <Link>.
 * Fixed footprint + delayed fade so quick navigations don't flash it.
 */
export function RowPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`row-hint inline-flex size-4 shrink-0 items-center justify-center ${
        pending ? "is-pending" : ""
      }`}
    >
      <Spinner size={16} />
    </span>
  );
}
