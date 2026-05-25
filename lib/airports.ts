import type { Airport } from "../types/flight";

// Minimal seed of airports for search/autocomplete/nearby suggestions
export const AIRPORTS: Airport[] = [
  {
    iata: "NBO",
    name: "Jomo Kenyatta International Airport",
    city: "Nairobi",
    country: "Kenya",
    lat: -1.3192,
    lon: 36.9278,
    timezone: "Africa/Nairobi",
  },
  {
    iata: "MBA",
    name: "Moi International Airport",
    city: "Mombasa",
    country: "Kenya",
    lat: -4.0346,
    lon: 39.594,
    timezone: "Africa/Nairobi",
  },
  {
    iata: "WIL",
    name: "Wilson Airport",
    city: "Nairobi",
    country: "Kenya",
    lat: -1.3178,
    lon: 36.8143,
    timezone: "Africa/Nairobi",
  },
  {
    iata: "KIS",
    name: "Kisumu International Airport",
    city: "Kisumu",
    country: "Kenya",
    lat: -0.0869,
    lon: 34.7288,
    timezone: "Africa/Nairobi",
  },
  {
    iata: "LOS",
    name: "Murtala Muhammed International Airport",
    city: "Lagos",
    country: "Nigeria",
    lat: 6.5774,
    lon: 3.3212,
    timezone: "Africa/Lagos",
  },
  {
    iata: "JNB",
    name: "O. R. Tambo International Airport",
    city: "Johannesburg",
    country: "South Africa",
    lat: -26.1367,
    lon: 28.242,
    timezone: "Africa/Johannesburg",
  },
  {
    iata: "DXB",
    name: "Dubai International Airport",
    city: "Dubai",
    country: "UAE",
    lat: 25.2532,
    lon: 55.3657,
    timezone: "Asia/Dubai",
  },
];

export function searchAirports(query: string, limit = 5): Airport[] {
  if (!query) return [];
  const q = query.trim().toLowerCase();
  return AIRPORTS.filter(
    (a) =>
      a.iata.toLowerCase().startsWith(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q),
  ).slice(0, limit);
}

function haversine(a: Airport, b: { lat: number; lon: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const val =
    sinDlat * sinDlat + sinDlon * sinDlon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(val), Math.sqrt(1 - val));
  return R * c;
}

export function nearbyAirports(
  lat: number,
  lon: number,
  radiusKm = 100,
): Airport[] {
  return AIRPORTS.map((a) => ({ a, d: haversine(a, { lat, lon }) }))
    .filter((x) => x.d <= radiusKm)
    .sort((x, y) => x.d - y.d)
    .map((x) => x.a);
}
