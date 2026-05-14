"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type Props = {
  data: {
    city: string;
    sales: number;
    percentage: number;
  }[];
};

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  Bogotá: { lat: 4.711, lng: -74.0721 },
  Medellín: { lat: 6.2442, lng: -75.5812 },
  Cali: { lat: 3.4516, lng: -76.532 },
  Barranquilla: { lat: 10.9685, lng: -74.7813 },
  Cartagena: { lat: 10.391, lng: -75.4794 },
  Pereira: { lat: 4.8143, lng: -75.6946 },
  Bucaramanga: { lat: 7.1193, lng: -73.1227 },
  Manizales: { lat: 5.0703, lng: -75.5138 },
  Cúcuta: { lat: 7.8939, lng: -72.5078 },
  "Santa Marta": { lat: 11.2408, lng: -74.199 },
};

const cityOffsets: Record<string, { lng: number; lat: number }> = {
  Bogotá: { lng: 0.35, lat: -0.2 },
  Medellín: { lng: -0.25, lat: 0.25 },
  Pereira: { lng: 0.2, lat: 0.15 },
  Manizales: { lng: -0.2, lat: -0.1 },
};

export function ColombiaSalesMap({ data }: Props) {
  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">Ventas por Ciudad</h2>

        <p className="text-sm text-slate-400">
          Distribución geográfica de ventas en Colombia
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-900">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 1450,
            center: [-73, 4.5],
          }}
          style={{
            width: "100%",
            height: "700px",
          }}
        >
          <ZoomableGroup zoom={2.8} center={[-73.5, 4.5]}>
            <Geographies geography={geoUrl}>
              {({ geographies }: any) =>
                geographies.map((geo: any) => {
                  if (geo.properties.name !== "Colombia") return null;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#0f172a"
                      stroke="#475569"
                      strokeWidth={1.2}
                      style={{
                        default: {
                          outline: "none",
                        },
                        hover: {
                          fill: "#1e293b",
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: {
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {data.map((location) => {
              const coordinates = cityCoordinates[location.city];

              if (!coordinates) return null;

              const offset = cityOffsets[location.city] || {
                lng: 0,
                lat: 0,
              };

              const size = Math.max(location.percentage * 0.9, 10);

              return (
                <Marker
                  key={location.city}
                  coordinates={[
                    coordinates.lng + offset.lng,
                    coordinates.lat + offset.lat,
                  ]}
                >
                  <g>
                    {/* Glow */}
                    <circle r={size + 8} fill="#22c55e" opacity={0.18} />

                    {/* Main */}
                    <circle
                      r={size}
                      fill="#22c55e"
                      stroke="#ffffff"
                      strokeWidth={2.5}
                    />

                    {/* Inner */}
                    <circle r={size / 2.2} fill="#bbf7d0" />

                    {/* City */}
                    <text
                      textAnchor="middle"
                      y={-(size + 14)}
                      style={{
                        fill: "#ffffff",
                        fontSize: "13px",
                        fontWeight: "bold",
                        fontFamily: "sans-serif",
                      }}
                    >
                      {location.city}
                    </text>

                    {/* Percentage */}
                    <text
                      textAnchor="middle"
                      y={size + 18}
                      style={{
                        fill: "#94a3b8",
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: "sans-serif",
                      }}
                    >
                      {location.percentage}%
                    </text>
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {data.slice(0, 4).map((location) => (
          <div
            key={location.city}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <p className="text-xs text-slate-400">{location.city}</p>

            <p className="mt-1 text-lg font-bold text-white">
              ${location.sales.toLocaleString()}
            </p>

            <p className="mt-1 text-sm font-medium text-green-400">
              {location.percentage}% del total
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
