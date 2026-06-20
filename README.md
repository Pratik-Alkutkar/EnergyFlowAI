# EnergyFlow AI

**Production-grade energy analytics, forecasting, and battery optimisation platform.**

> Portfolio project demonstrating: Python ETL · SQL Analytics · ML Forecasting · LP Optimisation · FastAPI · Next.js

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js (Vercel)                                               │
│  Landing · Dashboard · Analytics · Forecast · Optimizer · Copilot│
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP / JSON
┌────────────────────────▼────────────────────────────────────────┐
│  FastAPI (Render / Railway)                                     │
│  /health  /generate-data  /energy-data  /analytics/*           │
│  /forecast/*  /optimize/battery  /copilot/ask                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ asyncpg
┌────────────────────────▼────────────────────────────────────────┐
│  Neon Postgres                                                  │
│  energy_readings · forecast_results · optimization_results     │
│  daily_summary (materialised view)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer        | Technology                                    |
|-------------|----------------------------------------------|
| Frontend     | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Backend      | Python 3.11, FastAPI, asyncpg, SQLAlchemy     |
| Database     | Neon Postgres (serverless)                    |
| ML           | XGBoost, scikit-learn, pandas, numpy          |
| Optimisation | PuLP (CBC solver), scipy                      |
| Deployment   | Vercel (frontend), Render (backend)           |

---

## Project Structure

```
energyflow-ai/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + all routes
│   │   ├── config.py         # Pydantic settings
│   │   ├── database.py       # Async SQLAlchemy + Neon
│   │   ├── data_generator.py # Synthetic ERCOT/weather data
│   │   ├── etl.py            # Extract → Transform → Load pipeline
│   │   ├── analytics.py      # SQL analytics queries
│   │   ├── forecasting.py    # XGBoost demand/solar/price models
│   │   ├── optimization.py   # PuLP LP battery dispatch
│   │   ├── copilot.py        # AI copilot (OpenAI or rule-based)
│   │   └── models.py         # Pydantic request/response models
│   ├── sql/
│   │   ├── schema.sql        # Full DB schema (run once)
│   │   └── queries.sql       # Analytics SQL reference
│   ├── requirements.txt
│   ├── render.yaml           # Render deployment config
│   ├── Procfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # Landing page
    │   │   ├── dashboard/page.tsx # Main dashboard
    │   │   ├── analytics/page.tsx # SQL analytics
    │   │   ├── forecast/page.tsx  # ML forecasts
    │   │   ├── optimizer/page.tsx # LP optimisation
    │   │   └── copilot/page.tsx   # AI chat
    │   ├── components/
    │   │   ├── ui/               # KpiCard, Sidebar, PageHeader
    │   │   └── charts/           # Recharts wrappers
    │   └── lib/
    │       ├── api.ts            # All API calls + TypeScript types
    │       └── utils.ts          # Formatters, helpers
    ├── package.json
    ├── tailwind.config.ts
    └── .env.example
```

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Neon Postgres](https://neon.tech) database (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/energyflow-ai.git
cd energyflow-ai
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env → add your DATABASE_URL from Neon
```

**Run the backend:**

```bash
uvicorn app.main:app --reload --port 8000
```

The first startup will apply `schema.sql` automatically.

**Seed synthetic data (required before the frontend works):**

```bash
curl -X POST http://localhost:8000/generate-data
# Or use the "Seed Data" button on the Dashboard page
```

### 3. Frontend setup

```bash
cd frontend
npm install

cp .env.example .env.local
# Edit: NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Run the frontend:**

```bash
npm run dev
# Open http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint                       | Description                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/health`                     | Health check + DB status             |
| POST   | `/generate-data`              | Generate & seed synthetic data       |
| GET    | `/energy-data`                | Paginated energy readings            |
| GET    | `/analytics/summary`          | KPI summary (SQL aggregate)          |
| GET    | `/analytics/hourly-profile`   | Avg demand/solar by hour-of-day      |
| GET    | `/analytics/daily-totals`     | Daily totals trend                   |
| GET    | `/analytics/action-distribution` | Battery action breakdown          |
| GET    | `/analytics/savings-report`   | Daily cost savings                   |
| GET    | `/forecast/demand`            | XGBoost demand forecast              |
| GET    | `/forecast/solar`             | XGBoost solar forecast               |
| GET    | `/forecast/price`             | XGBoost ERCOT price forecast         |
| GET    | `/optimize/battery`           | PuLP LP battery dispatch schedule    |
| POST   | `/copilot/ask`                | Natural-language energy Q&A          |

Full interactive docs: `http://localhost:8000/docs`

---

## Deployment

### Neon Postgres

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string (with `?sslmode=require`)
3. Paste into backend `.env` as `DATABASE_URL`

The schema is applied automatically on first startup.

### Backend → Render

1. Push `backend/` to a GitHub repo
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables: `DATABASE_URL`, `CORS_ORIGINS`, `APP_ENV=production`
5. Deploy. Note your Render URL (e.g. `https://energyflow-api.onrender.com`)

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Import into [vercel.com](https://vercel.com)
3. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://energyflow-api.onrender.com`
4. Deploy. Vercel auto-detects Next.js.

---

## Data Schema

### `energy_readings`

| Column                | Type          | Description               |
|-----------------------|---------------|---------------------------|
| `timestamp`           | TIMESTAMPTZ   | Hourly UTC timestamp      |
| `demand_kwh`          | NUMERIC(10,3) | Site electricity demand   |
| `solar_generation_kwh`| NUMERIC(10,3) | Solar PV output           |
| `ercot_price_mwh`     | NUMERIC(10,4) | ERCOT LMP $/MWh           |
| `temperature`         | NUMERIC(6,2)  | °F                        |
| `cloud_cover`         | NUMERIC(5,2)  | 0–100%                    |
| `battery_soc`         | NUMERIC(5,2)  | State of charge 0–100%    |
| `grid_import_kwh`     | NUMERIC(10,3) | Net grid import           |
| `baseline_cost`       | NUMERIC(10,4) | Cost without battery ($)  |
| `optimized_cost`      | NUMERIC(10,4) | Cost with battery ($)     |
| `savings`             | NUMERIC(10,4) | Hourly savings ($)        |
| `action`              | VARCHAR(20)   | charge \| discharge \| idle |

---

## ML Models

### Forecasting (`forecasting.py`)

Three separate XGBoost models (GradientBoosting fallback):

**Features used:**
- Time: hour, day-of-week, month, day-of-year (sin/cos encoded)
- Weather: temperature, cloud_cover
- Lags: 1h, 2h, 24h, 48h, 168h
- Rolling stats: 6h mean/std, 24h mean

**Training:** 85% train / 15% holdout split on last 60 days of Postgres data.

**Output:** Hourly predictions with ±1.5σ confidence intervals.

### Battery Optimisation (`optimization.py`)

**Solver:** PuLP with CBC (falls back to rule-based heuristic)

**Variables:** charge[t], discharge[t], soc[t], grid_import[t]

**Objective:** Minimise Σ grid_import[t] × price[t]

**Constraints:**
- Energy balance: grid + discharge × η = net_load + charge / η
- SOC continuity: soc[t] = soc[t-1] + charge × η - discharge
- SOC bounds: 10% – 90% of capacity
- Power limits: charge ≤ 50kW, discharge ≤ 50kW
- Grid non-negativity (no export modelled)

---

## Real API Integration

The code is structured to accept real data by swapping `data_generator.py`:

```python
# In data_generator.py, replace generate_default_dataset() with:

# ERCOT market data (requires API key)
from ercot_client import fetch_lmp_prices

# Open-Meteo weather (free, no key)
import requests
weather = requests.get(
    "https://api.open-meteo.com/v1/forecast",
    params={"latitude": 30.27, "longitude": -97.74, "hourly": "temperature_2m,cloudcover"}
)

# NREL PVWatts (requires free API key)
pvwatts = requests.get(
    "https://developer.nrel.gov/api/pvwatts/v6.json",
    params={"api_key": NREL_API_KEY, "lat": 30.27, "lon": -97.74, "system_capacity": 250, ...}
)
```

---

## Portfolio Talking Points

| Skill                       | Demonstrated by                                    |
|-----------------------------|----------------------------------------------------|
| **Data Engineering / ETL**  | `etl.py` — validate, clean, upsert, refresh MV    |
| **SQL Analytics**           | `analytics.py` — 7 production SQL queries via asyncpg |
| **Machine Learning**        | `forecasting.py` — 3 XGBoost models with lag features |
| **Optimisation**            | `optimization.py` — PuLP LP with energy constraints |
| **Backend API Design**      | `main.py` — 13 FastAPI endpoints, Pydantic models  |
| **Frontend Engineering**    | Next.js 14 App Router, TypeScript, Recharts        |
| **Cloud / Deployment**      | Neon, Render, Vercel with env-based config         |
| **Energy Domain Knowledge** | ERCOT pricing structure, battery dispatch, solar models |

---

## License

MIT
