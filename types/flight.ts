export type SeatClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone?: string;
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string; // IATA
  destination: string; // IATA
  departAt: string; // ISO
  arriveAt: string; // ISO
  durationMinutes: number;
  stops: number;
  aircraft: string;
  terminal?: string;
  basePrice: number; // in USD
  currency?: string;
  seatsAvailable: Record<SeatClass, number>;
  refundable?: boolean;
  baggageIncluded?: boolean;
  mealIncluded?: boolean;
  wifiAvailable?: boolean;
  status?: "ON_TIME" | "DELAYED" | "CANCELLED";
}
