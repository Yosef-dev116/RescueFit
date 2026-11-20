"use client";

import dynamic from "next/dynamic";

import { EmptyField } from "@/components/document";

/*
 * FAHD OWNS THIS FILE (feature C3).
 *
 * Leaflet touches window as soon as it loads, so it must never render on
 * the server. This is the pattern that keeps it off the server. Note that
 * the dynamic() call with ssr: false has to live inside a "use client"
 * file, which is what this file is for.
 *
 * Replace ./agency-map with the real map component when you write it:
 *
 *   const AgencyMap = dynamic(() => import("./agency-map"), {
 *     ssr: false,
 *     loading: () => <EmptyField label="Loading the PEI map" />,
 *   });
 *
 * Remember these three things, which cost an hour each if you miss them:
 *
 * 1. Import "leaflet/dist/leaflet.css" in the map component itself.
 * 2. Give the map container an explicit height, or it renders 0 px tall.
 * 3. The OpenStreetMap tile layer needs its attribution, which is a
 *    licence condition, not a courtesy:
 *    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
 */

const AgencyMap = dynamic(() => import("./agency-map-placeholder"), {
  ssr: false,
  loading: () => (
    <EmptyField
      label="Box 12 &middot; Loading the PEI agency map"
      hint="Leaflet is loading in the browser."
    />
  ),
});

export function NetworkMap() {
  return <AgencyMap />;
}
