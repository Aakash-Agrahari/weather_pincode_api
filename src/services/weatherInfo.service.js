import { Pincode, WeatherRecord } from '../models/index.js';
import { resolvePincodeToLatLong } from './geocode.service.js';
import { fetchWeatherForLatLong } from './weather.service.js';
import ApiError from '../utils/apiError.js';

const PINCODE_REGEX = /^[0-9A-Za-z\- ]{3,10}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateInput(pincode, forDate) {
  if (!pincode || !PINCODE_REGEX.test(String(pincode).trim())) {
    throw new ApiError(400, 'A valid "pincode" query parameter is required');
  }
  if (!forDate || !DATE_REGEX.test(forDate) || Number.isNaN(Date.parse(forDate))) {
    throw new ApiError(400, 'A valid "for_date" query parameter (YYYY-MM-DD) is required');
  }
}

/**
 * Step 1 of the optimization: Pincode -> lat/long.
 * Looks up the DB first; only calls the Geocoding API on a cache miss.
 */
async function getOrCreatePincodeLocation(pincode, countryCode) {
  const existing = await Pincode.findOne({ where: { pincode, countryCode } });
  if (existing) {
    return { pincodeRecord: existing, fromCache: true };
  }

  const { latitude, longitude, place } = await resolvePincodeToLatLong(pincode, countryCode);

  const created = await Pincode.create({
    pincode,
    countryCode,
    latitude,
    longitude,
    place,
  });

  return { pincodeRecord: created, fromCache: false };
}

/**
 * Step 2 of the optimization: lat/long + date -> weather.
 * Looks up the DB first; only calls the Weather API on a cache miss
 * or when the cached record has gone stale (per WEATHER_CACHE_TTL_MINUTES).
 */
async function getOrFetchWeatherRecord(pincodeRecord, forDate) {
  const existing = await WeatherRecord.findOne({
    where: { PincodeId: pincodeRecord.id, forDate },
  });

  const ttlMinutes = Number(process.env.WEATHER_CACHE_TTL_MINUTES || 60);
  const isFresh =
    existing && Date.now() - new Date(existing.updatedAt).getTime() < ttlMinutes * 60 * 1000;

  // Only "today"/future forecast data can go stale and be refreshed;
  // past dates are immutable once fetched (if ever supported).
  if (existing && (isFresh || forDate < new Date().toISOString().slice(0, 10))) {
    return { weatherRecord: existing, fromCache: true };
  }

  const weatherData = await fetchWeatherForLatLong(
    pincodeRecord.latitude,
    pincodeRecord.longitude,
    forDate
  );

  const payload = {
    ...weatherData,
    rawResponse: JSON.stringify(weatherData.rawResponse),
  };

  let weatherRecord;
  if (existing) {
    weatherRecord = await existing.update(payload);
  } else {
    weatherRecord = await WeatherRecord.create({
      PincodeId: pincodeRecord.id,
      forDate,
      ...payload,
    });
  }

  return { weatherRecord, fromCache: false };
}

/**
 * Main entry point used by the controller. Given a pincode + date,
 * returns weather info, resolving/caching lat-long and weather data
 * in the DB so repeat calls avoid hitting the external APIs.
 */
export async function getWeatherForPincode(pincode, forDate, countryCode) {
  validateInput(pincode, forDate);

  const normalizedPincode = String(pincode).trim();
  const country = (countryCode || process.env.DEFAULT_COUNTRY_CODE || 'IN').toUpperCase();

  const { pincodeRecord, fromCache: locationFromCache } = await getOrCreatePincodeLocation(
    normalizedPincode,
    country
  );

  const { weatherRecord, fromCache: weatherFromCache } = await getOrFetchWeatherRecord(
    pincodeRecord,
    forDate
  );

  return {
    pincode: pincodeRecord.pincode,
    country: pincodeRecord.countryCode,
    location: {
      latitude: pincodeRecord.latitude,
      longitude: pincodeRecord.longitude,
      place: pincodeRecord.place,
    },
    for_date: forDate,
    weather: {
      temperature: weatherRecord.temperature,
      feelsLike: weatherRecord.feelsLike,
      tempMin: weatherRecord.tempMin,
      tempMax: weatherRecord.tempMax,
      humidity: weatherRecord.humidity,
      pressure: weatherRecord.pressure,
      windSpeed: weatherRecord.windSpeed,
      main: weatherRecord.weatherMain,
      description: weatherRecord.weatherDescription,
    },
    meta: {
      locationResolvedFromCache: locationFromCache,
      weatherResolvedFromCache: weatherFromCache,
    },
  };
}

export default { getWeatherForPincode, validateInput };
