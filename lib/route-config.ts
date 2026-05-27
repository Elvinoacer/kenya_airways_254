import { AIRPORTS } from "./airports";

const NAIROBI_IMAGE = "/images/nairobi.png";

export type RouteConfig = {
  key: string;
  origin: string;
  destination: string;
  title: string;
  image: string;
  basePrice: number;
  aircraft: string;
  terminal: string;
};

export const ROUTE_CONFIGS: RouteConfig[] = [
  {
    key: "NBO-DXB",
    origin: "NBO",
    destination: "DXB",
    title: "Nairobi to Dubai",
    image: "/images/dubai_travel.jpeg",
    basePrice: 220,
    aircraft: "Boeing 787 Dreamliner",
    terminal: "1",
  },
  {
    key: "DXB-NBO",
    origin: "DXB",
    destination: "NBO",
    title: "Dubai to Nairobi",
    image: NAIROBI_IMAGE,
    basePrice: 220,
    aircraft: "Boeing 787 Dreamliner",
    terminal: "1",
  },
  {
    key: "NBO-MBA",
    origin: "NBO",
    destination: "MBA",
    title: "Nairobi to Mombasa",
    image: "/images/mombasa.webp",
    basePrice: 95,
    aircraft: "Embraer E190",
    terminal: "1D",
  },
  {
    key: "MBA-NBO",
    origin: "MBA",
    destination: "NBO",
    title: "Mombasa to Nairobi",
    image: NAIROBI_IMAGE,
    basePrice: 95,
    aircraft: "Embraer E190",
    terminal: "1D",
  },
  {
    key: "NBO-LOS",
    origin: "NBO",
    destination: "LOS",
    title: "Nairobi to Lagos",
    image: "/images/lagos.webp",
    basePrice: 340,
    aircraft: "Boeing 737-800",
    terminal: "1A",
  },
  {
    key: "LOS-NBO",
    origin: "LOS",
    destination: "NBO",
    title: "Lagos to Nairobi",
    image: NAIROBI_IMAGE,
    basePrice: 340,
    aircraft: "Boeing 737-800",
    terminal: "1A",
  },
  {
    key: "NBO-JNB",
    origin: "NBO",
    destination: "JNB",
    title: "Nairobi to Johannesburg",
    image: "/images/cape-town-1-1.jpg",
    basePrice: 280,
    aircraft: "Boeing 737-800",
    terminal: "1A",
  },
  {
    key: "JNB-NBO",
    origin: "JNB",
    destination: "NBO",
    title: "Johannesburg to Nairobi",
    image: NAIROBI_IMAGE,
    basePrice: 280,
    aircraft: "Boeing 737-800",
    terminal: "1A",
  },
  {
    key: "NBO-KIS",
    origin: "NBO",
    destination: "KIS",
    title: "Nairobi to Kisumu",
    image: "/images/hero_image.png",
    basePrice: 70,
    aircraft: "Embraer E190",
    terminal: "1D",
  },
  {
    key: "KIS-NBO",
    origin: "KIS",
    destination: "NBO",
    title: "Kisumu to Nairobi",
    image: NAIROBI_IMAGE,
    basePrice: 70,
    aircraft: "Embraer E190",
    terminal: "1D",
  },
];

export function routeKey(origin?: string | null, destination?: string | null) {
  return `${(origin || "").toUpperCase()}-${(destination || "").toUpperCase()}`;
}

export function getRouteConfig(
  origin?: string | null,
  destination?: string | null,
) {
  const key = routeKey(origin, destination);
  return ROUTE_CONFIGS.find((route) => route.key === key) || null;
}

export function getAirportByCode(code?: string | null) {
  if (!code) return null;
  return (
    AIRPORTS.find(
      (airport) => airport.iata.toUpperCase() === code.toUpperCase(),
    ) || null
  );
}

export function getDestinationImage(destination?: string | null) {
  if (destination?.toUpperCase() === "NBO") {
    return NAIROBI_IMAGE;
  }
  const directRoute = ROUTE_CONFIGS.find(
    (route) => route.destination === destination?.toUpperCase(),
  );
  return directRoute?.image || "/images/hero_banner.png";
}
