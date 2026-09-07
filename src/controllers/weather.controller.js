import { getWeatherForPincode } from '../services/weatherInfo.service.js';

export async function getWeather(req, res, next) {
  try {
    const { pincode, for_date: forDate, country_code: countryCode } = req.query;
    const result = await getWeatherForPincode(pincode, forDate, countryCode);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export default { getWeather };
