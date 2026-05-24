const NOMINATIM_REVERSE_URL =
  "https://nominatim.openstreetmap.org/reverse";
const FALLBACK_COMMUNE = "Localisation inconnue";
const REQUEST_TIMEOUT_MS = 5000;

interface NominatimAddress {
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
}

interface NominatimReverseResponse {
  address?: NominatimAddress;
}

function isNominatimReverseResponse(
  value: unknown,
): value is NominatimReverseResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.address === undefined ||
    (record.address !== null && typeof record.address === "object")
  );
}

function pickCommune(address?: NominatimAddress): string {
  return (
    address?.village ||
    address?.town ||
    address?.city ||
    address?.municipality ||
    FALLBACK_COMMUNE
  );
}

export async function getCommune(lat: number, lon: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${NOMINATIM_REVERSE_URL}?format=json&lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(String(lon))}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RockSense/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) return FALLBACK_COMMUNE;

    const payload: unknown = await response.json();
    if (!isNominatimReverseResponse(payload)) return FALLBACK_COMMUNE;

    return pickCommune(payload.address);
  } catch {
    return FALLBACK_COMMUNE;
  } finally {
    clearTimeout(timeoutId);
  }
}
