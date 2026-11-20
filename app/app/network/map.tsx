"use client";

import dynamic from "next/dynamic";

import { EmptyField } from "@/components/document";
import type { Agency } from "@/lib/schemas";

/*
 * Leaflet touches window as soon as it loads, so it must never render on
 * the server. dynamic() with ssr: false keeps it off the server, and that
 * call has to live in a "use client" file, which is what this file is for.
 */
const AgencyMap = dynamic(() => import("./agency-map"), {
  ssr: false,
  loading: () => (
    <EmptyField
      label="Box 12 &middot; Loading the PEI agency map"
      hint="The map is loading in the browser."
      className="min-h-[22rem]"
    />
  ),
});

export function NetworkMap(props: { agencies: Agency[]; homeId: string }) {
  return <AgencyMap {...props} />;
}
