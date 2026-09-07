import './testSetup.js';
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import nock from 'nock';
import { fetchWeatherForLatLong } from '../src/services/weather.service.js';
import ApiError from '../src/utils/apiError.js';

const BASE = 'https://api.openweathermap.org';

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

describe('weather.service', () => {
  afterEach(() => nock.cleanAll());

  test('fetches current weather when for_date is today', async () => {
    const today = todayDateOnly();

    nock(BASE)
      .get('/data/2.5/weather')
      .query({ lat: '18.5601', lon: '73.9158', appid: 'test-api-key', units: 'metric' })
      .reply(200, {
        main: { temp: 29.5, feels_like: 31, temp_min: 27, temp_max: 31, humidity: 60, pressure: 1008 },
        wind: { speed: 3.1 },
        weather: [{ main: 'Clouds', description: 'scattered clouds' }],
      });

    const result = await fetchWeatherForLatLong(18.5601, 73.9158, today);

    assert.equal(result.temperature, 29.5);
    assert.equal(result.weatherMain, 'Clouds');
    assert.equal(result.weatherDescription, 'scattered clouds');
  });

  test('fetches forecast weather for a future date within 5 days', async () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    nock(BASE)
      .get('/data/2.5/forecast')
      .query({ lat: '18.5601', lon: '73.9158', appid: 'test-api-key', units: 'metric' })
      .reply(200, {
        list: [
          {
            dt_txt: `${future} 12:00:00`,
            main: { temp: 25, feels_like: 26, temp_min: 24, temp_max: 27, humidity: 55, pressure: 1010 },
            wind: { speed: 2.5 },
            weather: [{ main: 'Rain', description: 'light rain' }],
          },
        ],
      });

    const result = await fetchWeatherForLatLong(18.5601, 73.9158, future);

    assert.equal(result.temperature, 25);
    assert.equal(result.weatherMain, 'Rain');
  });

  test('throws a 501 ApiError for a past date (not supported)', async () => {
    await assert.rejects(
      () => fetchWeatherForLatLong(18.5601, 73.9158, '2020-10-15'),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 501);
        return true;
      }
    );
  });
});
