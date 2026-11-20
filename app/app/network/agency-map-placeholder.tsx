"use client";

import { EmptyField } from "@/components/document";

/*
 * FAHD: delete this file and put the real Leaflet map in its place.
 * app/network/map.tsx already loads it with ssr: false.
 */
export default function AgencyMapPlaceholder() {
  return (
    <EmptyField
      label="Box 12 &middot; PEI agency map"
      hint="Fahd: the Leaflet map goes here, with a marker per agency from agencies.json and the OpenStreetMap attribution."
      className="min-h-[18rem]"
    />
  );
}
