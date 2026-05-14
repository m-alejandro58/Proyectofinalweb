"use client";

import { normalize } from "path";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

type Props = {
  data: {
    city: string;
    sales: number;
    percentage: number;
  }[];
};

const cityCoordinates: Record<
  string,
  {
    lat: number;
    lng: number;
  }
> = {
  Bogotá: { lat: 4.711, lng: -74.0721 },
  Medellín: { lat: 6.2442, lng: -75.5812 },
  Cali: { lat: 3.4516, lng: -76.532 },
  Barranquilla: { lat: 10.9685, lng: -74.7813 },
  Cartagena: { lat: 10.391, lng: -75.4794 },
  Pereira: { lat: 4.8143, lng: -75.6946 },
  Dosquebradas: { lat: 4.8392, lng: -75.6673 },
  Armenia: { lat: 4.5339, lng: -75.6811 },
  Bucaramanga: { lat: 7.1193, lng: -73.1227 },
  Manizales: { lat: 5.0703, lng: -75.5138 },
  Cúcuta: { lat: 7.8939, lng: -72.5078 },
  "Santa Marta": { lat: 11.2408, lng: -74.199 },
  Ibagué: { lat: 4.4389, lng: -75.2322 },
  Pasto: { lat: 1.2136, lng: -77.2811 },
  Villavicencio: { lat: 4.142, lng: -73.6266 },
};

const cityOffsets: Record<
  string,
  {
    lng: number;
    lat: number;
  }
> = {
  Bogotá: { lng: 0.5, lat: -0.15 },

  Medellín: { lng: -0.5, lat: 0.35 },

  Pereira: { lng: 0.55, lat: 0.15 },

  Dosquebradas: { lng: 0.9, lat: -0.1 },

  Armenia: { lng: -0.55, lat: -0.35 },

  Manizales: { lng: -0.45, lat: 0.45 },

  Cali: { lng: -0.3, lat: -0.25 },

  Cartagena: { lng: -0.3, lat: 0.3 },

  Barranquilla: { lng: 0.45, lat: -0.1 },

  Bucaramanga: { lng: 0.4, lat: 0.2 },

  "Santa Marta": { lng: 0.4, lat: 0.3 },
};

export function ColombiaSalesMap({ data }: Props) {
  return (
    <div className="w-full rounded-3xl border border-slate-800 bg-[#020817] p-6 shadow-2xl">
      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Ventas por Ciudad</h2>

        <p className="mt-1 text-sm text-slate-400">
          Distribución geográfica de ventas en Colombia
        </p>
      </div>

      {/* MAP */}
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#020b24]">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 2100,
            center: [-73.5, 4.5],
          }}
          style={{
            width: "100%",
            height: "700px",
          }}
        >
          <ZoomableGroup
            center={[-73.5, 4.5]}
            zoom={1.25}
            minZoom={1}
            maxZoom={8}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }: { geographies: any[] }) =>
                geographies
                  .filter((geo: any) => geo.properties?.name === "Colombia")
                  .map((geo: any) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#13233f"
                      stroke="#475569"
                      strokeWidth={0.7}
                      style={{
                        default: {
                          outline: "none",
                        },
                        hover: {
                          fill: "#1e3357",
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: {
                          outline: "none",
                        },
                      }}
                    />
                  ))
              }
            </Geographies>

            {data.map((location) => {
              const normalizedCity = location.city.split(",")[0].trim();

              const coordinates = cityCoordinates[normalizedCity];

              if (!coordinates) return null;

              const offset = cityOffsets[normalizedCity] || {
                lng: 0,
                lat: 0,
              };

              const size = Math.max(location.percentage * 0.55, 8);

              return (
                <Marker
                  key={location.city}
                  coordinates={[
                    coordinates.lng + offset.lng,
                    coordinates.lat + offset.lat,
                  ]}
                >
                  <g>
                    {/* GLOW */}
                    <circle r={size + 10} fill="#22c55e" opacity={0.18} />

                    {/* OUTER */}
                    <circle
                      r={size}
                      fill="#22c55e"
                      stroke="#dcfce7"
                      strokeWidth={2.5}
                    />

                    {/* INNER */}
                    <circle r={size / 2.5} fill="#dcfce7" />

                    {/* CITY NAME */}
                    <text
                      textAnchor="middle"
                      y={-(size + 16)}
                      style={{
                        fill: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        fontFamily: "sans-serif",
                      }}
                    >
                      {location.city}
                    </text>

                    {/* PERCENTAGE */}
                    <text
                      textAnchor="middle"
                      y={size + 20}
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

      {/* CARDS */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.slice(0, 8).map((location) => {
          const normalizedCity = location.city.split(",")[0].trim();

          return (
            <div
              key={location.city}
              className="rounded-2xl border border-slate-800 bg-[#07122b] p-5"
            >
              <p className="text-sm text-slate-400">{normalizedCity}</p>

              <h3 className="mt-1 text-2xl font-bold text-white">
                ${location.sales.toLocaleString("es-CO")}
              </h3>

              <p className="mt-2 text-sm font-semibold text-emerald-400">
                {location.percentage}% del total
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
