import axios from 'axios';
import ApiError from '../utils/apiError.js';

const GEOCODE_URL = 'https://api.openweathermap.org/geo/1.0/zip';

/**
 * Resolves a pincode/zip code to { latitude, longitude, place } using
 * OpenWeather's Geocoding API.
 * https://openweathermap.org/api/geocoding-api
 *
 * @param {string} pincode
 * @param {string} countryCode - ISO 3166 country code, e.g. "IN"
 */
export async function resolvePincodeToLatLong(pincode, countryCode) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new ApiError(500, 'OPENWEATHER_API_KEY is not configured on the server');
  }

  try {
    const response = await axios.get(GEOCODE_URL, {
      params: {
        zip: `${pincode},${countryCode}`,
        appid: apiKey,
      },
      timeout: 10000,
    });

    const { lat, lon, name } = response.data;

    if (lat === undefined || lon === undefined) {
      throw new ApiError(502, 'Geocoding API returned an unexpected response');
    }

    return { latitude: lat, longitude: lon, place: name };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        throw new ApiError(404, `Could not resolve pincode "${pincode}" to a location`);
      }
      throw new ApiError(
        502,
        `Geocoding API request failed with status ${status}`,
        error.response.data
      );
    }

    throw new ApiError(502, `Geocoding API request failed: ${error.message}`);
  }
}

export default { resolvePincodeToLatLong };
