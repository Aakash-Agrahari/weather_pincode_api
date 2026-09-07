import './testSetup.js';
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import nock from 'nock';
import { resolvePincodeToLatLong } from '../src/services/geocode.service.js';
import ApiError from '../src/utils/apiError.js';

const BASE = 'https://api.openweathermap.org';

describe('geocode.service', () => {
  afterEach(() => nock.cleanAll());

  test('resolves a pincode to lat/long', async () => {
    nock(BASE)
      .get('/geo/1.0/zip')
      .query({ zip: '411014,IN', appid: 'test-api-key' })
      .reply(200, { zip: '411014', name: 'Pune', lat: 18.5601, lon: 73.9158, country: 'IN' });

    const result = await resolvePincodeToLatLong('411014', 'IN');

    assert.equal(result.latitude, 18.5601);
    assert.equal(result.longitude, 73.9158);
    assert.equal(result.place, 'Pune');
  });

  test('throws a 404 ApiError when the pincode cannot be resolved', async () => {
    nock(BASE)
      .get('/geo/1.0/zip')
      .query({ zip: '000000,IN', appid: 'test-api-key' })
      .reply(404, { cod: '404', message: 'not found' });

    await assert.rejects(
      () => resolvePincodeToLatLong('000000', 'IN'),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  test('throws a 502 ApiError when the upstream API is unreachable', async () => {
    nock(BASE)
      .get('/geo/1.0/zip')
      .query({ zip: '411014,IN', appid: 'test-api-key' })
      .replyWithError('network down');

    await assert.rejects(
      () => resolvePincodeToLatLong('411014', 'IN'),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 502);
        return true;
      }
    );
  });
});
