# Weather Info for Pincode API

A REST API (no UI) that returns weather information for a given **Pincode** and
**date**. Built to satisfy the "Backend Assignment - Weather Info for Pincode"
spec:

- Pincode → lat/long is resolved via OpenWeather's Geocoding API and **saved
  in an RDBMS (SQLite via Sequelize)**.
- Weather information for that pincode + date is **also saved in the DB**.
- On subsequent calls for the same pincode/date, the API **reads from the DB
  instead of re-calling the external APIs** ("optimized for API calls").
- Testable via Postman or Swagger UI.
- Code is layered (routes → controllers → services → models) and has an
  automated test suite (unit + integration, written TDD-style).

## Tech stack

- Node.js + Express, **ES Modules** (`"type": "module"`)
- Sequelize + SQLite (a real RDBMS; swap the `dialect` in
  `src/config/database.js` for Postgres/MySQL in production without touching
  business logic)
- `axios` for calling OpenWeather
- `swagger-jsdoc` + `swagger-ui-express` for interactive API docs
- Node's built-in test runner (`node:test`) + `supertest` + `nock` for tests

## How the "optimization" works

```
GET /api/weather?pincode=411014&for_date=2020-10-15
        │
        ▼
1. Look up `pincodes` table for this pincode.
     - Found  -> reuse stored lat/long (no Geocoding API call)
     - Not found -> call OpenWeather Geocoding API once, save lat/long
        │
        ▼
2. Look up `weather_records` table for (pincode, for_date).
     - Found & fresh (< WEATHER_CACHE_TTL_MINUTES old, or a past date,
       which is immutable) -> return cached weather (no Weather API call)
     - Not found / stale -> call OpenWeather Weather API, save/update record
        │
        ▼
3. Return combined JSON with a `meta` block showing whether each part
   came from cache.
```

## Project structure

```
src/
  config/database.js          Sequelize/SQLite connection
  models/                     Pincode, WeatherRecord (Sequelize models)
  services/
    geocode.service.js        Pincode -> lat/long (OpenWeather Geocoding API)
    weather.service.js        lat/long + date -> weather (OpenWeather API)
    weatherInfo.service.js    Orchestrates the DB-caching logic
  controllers/weather.controller.js
  routes/                     Express routes + Swagger JSDoc annotations
  middlewares/errorHandler.js
  swagger/swagger.js          swagger-jsdoc config
  app.js                      Express app factory (used by server + tests)
  server.js                   Entry point (boots DB, then the HTTP server)
tests/                        node:test + supertest + nock test suite
```

## Setup

### 1. Prerequisites

- Node.js 18+ (uses native `node:test`, ES Modules)
- A free OpenWeather API key: https://home.openweathermap.org/users/sign_up
  (after signing up, the key can take up to a couple of hours to activate)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3000
OPENWEATHER_API_KEY=your_real_openweather_api_key
DEFAULT_COUNTRY_CODE=IN
DB_STORAGE_PATH=./data/weather.sqlite
WEATHER_CACHE_TTL_MINUTES=60
```

### 4. Run the server

```bash
npm start
# or, for auto-restart on file changes:
npm run dev
```

You should see:

```
Weather Info for Pincode API listening on http://localhost:3000
Swagger docs available at http://localhost:3000/docs
```

A SQLite file is created automatically at `DB_STORAGE_PATH` (tables are
created on first boot — no manual migration step needed for this
assignment).

## Using the API

### Endpoint

```
GET /api/weather?pincode=411014&for_date=2020-10-15
```

Query params:

| Param          | Required | Example      | Notes                                              |
|----------------|----------|--------------|-----------------------------------------------------|
| `pincode`      | yes      | `411014`     | Postal/PIN code                                     |
| `for_date`     | yes      | `2020-10-15` | `YYYY-MM-DD`                                        |
| `country_code` | no       | `IN`         | ISO 3166 code, defaults to `DEFAULT_COUNTRY_CODE`   |

### Example with curl

```bash
curl "http://localhost:3000/api/weather?pincode=411014&for_date=2026-09-07"
```

Example response:

```json
{
  "success": true,
  "data": {
    "pincode": "411014",
    "country": "IN",
    "location": { "latitude": 18.5601, "longitude": 73.9158, "place": "Pune" },
    "for_date": "2026-09-07",
    "weather": {
      "temperature": 29.5,
      "feelsLike": 31,
      "tempMin": 27,
      "tempMax": 31,
      "humidity": 60,
      "pressure": 1008,
      "windSpeed": 3.1,
      "main": "Clouds",
      "description": "scattered clouds"
    },
    "meta": {
      "locationResolvedFromCache": false,
      "weatherResolvedFromCache": false
    }
  }
}
```

Call it again with the **same** `pincode` + `for_date` and both `meta` flags
flip to `true` — the DB is used instead of calling OpenWeather again.

### A note on `for_date`

OpenWeather's free tier only exposes:
- **Current weather** (used when `for_date` = today)
- **5-day / 3-hour forecast** (used when `for_date` is up to 5 days in the
  future — the API picks the forecast slot closest to noon on that day)
- **Past dates** require OpenWeather's paid "One Call — Timemachine"
  endpoint. The API responds with a clear `501` for past dates rather than
  silently returning wrong data. The DB schema and caching logic already
  supports storing historical records — swapping in the paid endpoint
  inside `weather.service.js` is a self-contained change.

### Testing via Postman

1. Import the OpenAPI spec directly: in Postman, **Import → Link** and use
   `http://localhost:3000/openapi.json` (server must be running), or
2. Create a plain `GET` request to `http://localhost:3000/api/weather` with
   query params `pincode` and `for_date`.

### Testing via Swagger UI

With the server running, open:

```
http://localhost:3000/docs
```

Expand `GET /api/weather`, click **Try it out**, fill in `pincode` and
`for_date`, and execute.

### Health check

```
GET /health   -> { "status": "ok" }
```

## Running the tests (TDD)

```bash
npm test
```

This runs unit tests for the geocoding and weather services (HTTP calls are
mocked with `nock`, no real network/API key needed) plus integration tests
that hit the Express app end-to-end with `supertest`, using an in-memory
SQLite DB. The caching test explicitly disables network access on the second
request to prove no external API call is made once data is cached.

```
# tests 10
# pass 10
# fail 0
```

## Design notes / trade-offs

- **SQLite** was chosen so the project runs with zero external setup (no DB
  server to install) while still being a real RDBMS as required. Because the
  logic goes through Sequelize, switching `dialect: 'sqlite'` to
  `'postgres'`/`'mysql'` (and adding `pg`/`mysql2`) is the only change needed
  for a "real" deployment.
- **Two-level cache**: pincode→lat/long is cached indefinitely (a pincode's
  location doesn't change); weather is cached per pincode+date with a
  configurable TTL for "today" (since current weather changes through the
  day) and treated as immutable once fetched for past dates.
- Input is validated before any external call is made (`pincode` format,
  `for_date` format) to avoid wasting API quota on bad requests.
- Errors from upstream APIs are translated into clear HTTP status codes
  (`400` validation, `404` unknown pincode, `501` unsupported date range,
  `502` upstream failure) instead of leaking raw axios errors.
