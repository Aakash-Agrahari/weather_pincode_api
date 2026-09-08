import { Router } from 'express';
import { getWeather } from '../controllers/weather.controller.js';

const router = Router();

//this is for swagger documentation of the API
/**
 * @openapi
 * /api/weather:
 *   get:
 *     summary: Get weather information for a Pincode on a given date
 *     description: >
 *       Resolves the pincode to lat/long (cached in the DB after the first
 *       lookup) and returns weather information for the given date
 *       (cached in the DB per pincode + date to minimize external API calls).
 *     tags:
 *       - Weather
 *     parameters:
 *       - in: query
 *         name: pincode
 *         required: true
 *         schema:
 *           type: string
 *         example: "411014"
 *         description: Postal / PIN code to look up.
 *       - in: query
 *         name: for_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2020-10-15"
 *         description: Date (YYYY-MM-DD) to fetch the weather for.
 *       - in: query
 *         name: country_code
 *         required: false
 *         schema:
 *           type: string
 *         example: "IN"
 *         description: ISO 3166 country code. Defaults to DEFAULT_COUNTRY_CODE env var (IN).
 *     responses:
 *       200:
 *         description: Weather information for the given pincode and date.
 *       400:
 *         description: Invalid or missing query parameters.
 *       404:
 *         description: Pincode could not be resolved to a location.
 *       501:
 *         description: Requested date is not supported by the configured weather API plan.
 *       502:
 *         description: Upstream Geocoding/Weather API error.
 */
router.get('/weather', getWeather);

export default router;
