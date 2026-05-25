import type { FlightSearchParams } from "./flights";
import { searchFlights } from "./flights";

// Adapter abstraction for integrating with external flight providers.
// For now this provides a thin adapter that calls our mock `searchFlights`.
// Replace the `fetchFromProvider` implementation with real provider HTTP calls,
// mapping their response into our `Flight` type.

export async function fetchFromProvider(params: FlightSearchParams) {
  // Example: would call provider API, transform fields, normalize currency, etc.
  // Keep current behavior to allow switching to a real provider later.
  return searchFlights(params);
}
