"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";

import type { Agency } from "@/lib/schemas";

/*
 * The PEI agency map (feature C3).
 *
 * CircleMarker draws with SVG, so it needs no marker image. That avoids
 * the missing default icon in react-leaflet, and an icon URL that the CSP
 * would block. Tiles come from OpenStreetMap, which img-src allows, and
 * the attribution is a licence condition.
 */

// Prince Edward Island, west tip to east tip.
const PEI_BOUNDS: [[number, number], [number, number]] = [
  [45.95, -64.42],
  [47.07, -61.97],
];

export default function AgencyMap({
  agencies,
  homeId,
}: {
  agencies: Agency[];
  homeId: string;
}) {
  return (
    <div className="form-box overflow-hidden">
      <p className="typed border-b border-ink bg-ink px-3 py-1.5 text-[0.6875rem] tracking-[0.14em] text-manila uppercase">
        Box 12 &middot; PEI agency map
      </p>
      <MapContainer
        bounds={PEI_BOUNDS}
        scrollWheelZoom={false}
        className="h-[22rem] w-full"
        aria-label="Map of the PEI agencies RescueFit can route surplus to"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {agencies.map((agency) => {
          const home = agency.id === homeId;
          return (
            <CircleMarker
              key={agency.id}
              center={[agency.lat, agency.lon]}
              radius={home ? 10 : 8}
              pathOptions={{
                color: "#1c1a16",
                weight: 2,
                fillColor: home ? "#b2291f" : "#2f5d43",
                fillOpacity: 0.9,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {agency.name}
              </Tooltip>
              <Popup>
                <strong>{agency.name}</strong>
                <br />
                {agency.town}
                {home ? " (distances are measured from here)" : ""}
                <br />
                Free: {agency.free_kg.fridge} kg fridge, {agency.free_kg.freezer} kg
                freezer, {agency.free_kg.dry} kg dry
                <br />
                {agency.meals_per_day} meals per day
                {agency.diet_flags.length > 0 ? (
                  <>
                    <br />
                    {agency.diet_flags.join(", ")}
                  </>
                ) : null}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
