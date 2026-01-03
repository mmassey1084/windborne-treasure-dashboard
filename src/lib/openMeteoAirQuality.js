import { fetchJsonSafely } from "./safeJson.js";

/**
 * Open-Meteo Air Quality:
 * https://open-meteo.com/en/docs/air-quality-api
 * ill request current + hourly for a quick “environment context” panel.
 */
export async function fetchAirQualityForLocation({ latitude, longitude }) {
  const endpoint = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  endpoint.searchParams.set("latitude", String(latitude));
  endpoint.searchParams.set("longitude", String(longitude));

  //current + a few hourly fields.
  endpoint.searchParams.set("current", "us_aqi,pm10,pm2_5,carbon_monoxide");
  endpoint.searchParams.set("hourly", "us_aqi,pm10,pm2_5");
  endpoint.searchParams.set("timezone", "auto");

  return fetchJsonSafely(endpoint.toString());
}
