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
 *
 * One more, and it will cost you an hour if you hit it cold. The default
 * marker icon is missing in react-leaflet, and the popular fix online points
 * L.Icon.Default at unpkg.com. Do not use it. This app sends a
 * Content-Security-Policy that allows images from itself and from the
 * OpenStreetMap tile hosts only, so an unpkg URL is blocked and the marker
 * stays missing with a different cause. Import the images instead, which
 * bundles them and serves them from this origin:
 *
 *   import markerIcon from "leaflet/dist/images/marker-icon.png";
 *   import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
 *   import markerShadow from "leaflet/dist/images/marker-shadow.png";
 *
 * Raster tiles need no other policy change. A search box or vector tiles
 * would, because those are fetch() calls and need connect-src.
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
