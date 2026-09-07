import './testSetup.js';
import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import nock from 'nock';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initDb, sequelize } from '../src/models/index.js';

const BASE = 'https://api.openweathermap.org';

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

let app;

describe('GET /api/weather', () => {
  before(async () => {
    await initDb();
    app = createApp();
  });

  after(async () => {
    await sequelize.close();
  });

  afterEach(() => nock.cleanAll());

  test('400 when pincode is missing', async () => {
    const res = await request(app).get('/api/weather').query({ for_date: todayDateOnly() });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('400 when for_date is invalid', async () => {
    const res = await request(app)
      .get('/api/weather')
      .query({ pincode: '411014', for_date: 'not-a-date' });
    assert.equal(res.status, 400);
  });

  test('resolves pincode + weather on first call, then serves from DB cache on the second call', async () => {
    const today = todayDateOnly();

    const geoScope = nock(BASE)
      .get('/geo/1.0/zip')
      .query({ zip: '411014,IN', appid: 'test-api-key' })
      .reply(200, { zip: '411014', name: 'Pune', lat: 18.5601, lon: 73.9158, country: 'IN' });

    const weatherScope = nock(BASE)
      .get('/data/2.5/weather')
      .query({ lat: '18.5601', lon: '73.9158', appid: 'test-api-key', units: 'metric' })
      .reply(200, {
        main: { temp: 29.5, feels_like: 31, temp_min: 27, temp_max: 31, humidity: 60, pressure: 1008 },
        wind: { speed: 3.1 },
        weather: [{ main: 'Clouds', description: 'scattered clouds' }],
      });

    const firstRes = await request(app)
      .get('/api/weather')
      .query({ pincode: '411014', for_date: today });

    assert.equal(firstRes.status, 200);
    assert.equal(firstRes.body.data.weather.temperature, 29.5);
    assert.equal(firstRes.body.data.meta.locationResolvedFromCache, false);
    assert.equal(firstRes.body.data.meta.weatherResolvedFromCache, false);
    assert.ok(geoScope.isDone(), 'geocode API should have been called');
    assert.ok(weatherScope.isDone(), 'weather API should have been called');

    // Disallow any further *external* HTTP calls (but still allow the
    // local supertest -> app connection): the second request MUST be
    // served entirely from the DB cache (the whole point of the
    // "optimize API calls" requirement).
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');

    let secondRes;
    try {
      secondRes = await request(app)
        .get('/api/weather')
        .query({ pincode: '411014', for_date: today });
    } finally {
      nock.enableNetConnect();
    }

    assert.equal(secondRes.status, 200);
    assert.equal(secondRes.body.data.weather.temperature, 29.5);
    assert.equal(secondRes.body.data.meta.locationResolvedFromCache, true);
    assert.equal(secondRes.body.data.meta.weatherResolvedFromCache, true);
  });

  test('502 when the upstream geocoding API fails', async () => {
    nock(BASE)
      .get('/geo/1.0/zip')
      .query({ zip: '999999,IN', appid: 'test-api-key' })
      .reply(500, { message: 'server error' });

    const res = await request(app)
      .get('/api/weather')
      .query({ pincode: '999999', for_date: todayDateOnly() });

    assert.equal(res.status, 502);
    assert.equal(res.body.success, false);
  });
});
