import axios from 'axios';
import ApiError from '../utils/apiError.js';

const CURRENT_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCurrentWeatherResponse(data) {
  return {
    temperature: data.main?.temp,
    feelsLike: data.main?.feels_like,
    tempMin: data.main?.temp_min,
    tempMax: data.main?.temp_max,
    humidity: data.main?.humidity,
    pressure: data.main?.pressure,
    windSpeed: data.wind?.speed,
    weatherMain: data.weather?.[0]?.main,
    weatherDescription: data.weather?.[0]?.description,
    rawResponse: data,
  };
}

/**
 * Picks the forecast entry closest to 12:00 on the target date from a
 * 5 day / 3 hour forecast response list.
 */
function pickClosestForecastEntry(list, forDate) {
  const target = new Date(`${forDate}T12:00:00Z`).getTime();
  let best = null;
  let bestDiff = Infinity;

  for (const entry of list) {
    const entryTime = new Date(entry.dt_txt.replace(' ', 'T') + 'Z').getTime();
    const diff = Math.abs(entryTime - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }

  return best;
}

/**
 * Fetches weather information for a lat/long + date from OpenWeather.
 *
 * - `for_date` === today  -> Current Weather Data API
 * - `for_date` in the next 5 days -> 5 day / 3 hour Forecast API
 * - `for_date` in the past -> not supported on the free tier (requires
 *   the paid One Call "timemachine" historical endpoint), so we throw
 *   a clear 501 rather than silently returning wrong data.
 *
 * https://openweathermap.org/current
 * https://openweathermap.org/forecast5
 */
export async function fetchWeatherForLatLong(latitude, longitude, forDate) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new ApiError(500, 'OPENWEATHER_API_KEY is not configured on the server');
  }

  const today = todayDateOnly();

  try {
    if (forDate === today) {
      const response = await axios.get(CURRENT_WEATHER_URL, {
        params: { lat: latitude, lon: longitude, appid: apiKey, units: 'metric' },
        timeout: 10000,
      });
      return normalizeCurrentWeatherResponse(response.data);
    }

    if (forDate > today) {
      const response = await axios.get(FORECAST_URL, {
        params: { lat: latitude, lon: longitude, appid: apiKey, units: 'metric' },
        timeout: 10000,
      });

      const entry = pickClosestForecastEntry(response.data.list || [], forDate);
      if (!entry) {
        throw new ApiError(
          422,
          `for_date "${forDate}" is outside the available 5-day forecast window`
        );
      }
      return normalizeCurrentWeatherResponse(entry);
    }

    // Past date: the free/current-weather & forecast endpoints cannot
    // serve this. Historical data requires OpenWeather's paid
    // One Call "timemachine" endpoint.
    throw new ApiError(
      501,
      `Historical weather for "${forDate}" is not available on the configured OpenWeather plan`
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error.response) {
      throw new ApiError(
        502,
        `Weather API request failed with status ${error.response.status}`,
        error.response.data
      );
    }

    throw new ApiError(502, `Weather API request failed: ${error.message}`);
  }
}

export default { fetchWeatherForLatLong };
