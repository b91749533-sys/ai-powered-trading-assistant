# AI-Powered Trading Assistant with TradingView Integration

A production-grade, personal trading platform that integrates with TradingView webhook alerts, parses market conditions using an AI engine (OpenAI-compatible), evaluates risk criteria, logs trades, and displays performance metrics on a premium dark-themed dashboard.

---

## Architecture Overview

- **Frontend**: Next.js 15, TypeScript, TailwindCSS, Recharts, and TradingView Lightweight Charts widgets.
- **Backend**: FastAPI (Python), SQLAlchemy 2.0 ORM, and Pydantic validation.
- **Database**: PostgreSQL storing signals, analyses, strategies, trades, and metrics.
- **AI Service**: Dedicated OpenAI-compatible API analyzer (with a dynamic rule-based local simulator for out-of-the-box local testing without an API key).
- **Risk Management**: Auto position-sizing limits based on portfolio capital and Stop Loss distance.
- **Backtesting**: Historical signal strategy backtest emulator with metrics aggregation (win rate, profit factor, drawdown, Sharpe ratio).

---

## ⚡ Quick Start: Docker Compose

The easiest way to run the entire stack (Database, Backend, and Frontend) is with Docker Compose:

```bash
docker-compose up --build
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: Port `5432`

---

## 🛠️ Local Development Setup

To run services locally for development:

### Prerequisites
- Node.js 20+ & npm
- Python 3.12+
- PostgreSQL server (running on port `5432` with credentials matching `backend/.env`)

### 1. Database Initialization
Ensure PostgreSQL is active. Create the database manually if needed:
```sql
CREATE DATABASE trading_assistant;
```
*(Note: The FastAPI backend automatically compiles and creates all necessary tables on startup!)*

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install package dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy env configs and run server:
   ```bash
   cp .env.example .env
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`.

---

## 📡 TradingView Webhook Alerts

The webhook endpoint is exposed at:
`POST http://localhost:8000/api/v1/webhook`

### Alert Payload Sample:
```json
{
    "symbol": "BTCUSDT",
    "timeframe": "1H",
    "price": 95500.0,
    "signal": "LONG",
    "rsi": 64.0,
    "macd": "bullish crossover",
    "volume": 1200000.0
}
```

### Curl test script:
```bash
curl -X POST http://localhost:8000/api/v1/webhook \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","timeframe":"1H","price":95500.0,"signal":"LONG","rsi":64.0,"macd":"bullish crossover","volume":1200000.0}'
```

---

## 📈 Dashboard Features
1. **Interactive Charts**: Rendered using high-performance Lightweight Charts marking entries.
2. **Strategy Management**: Create customized RSI thresholds and Stop Loss/Take Profit percentages.
3. **Backtest Simulator**: Backtest your strategy rules on incoming signals history immediately.
4. **Mock Alerts Emitter**: Built-in dialog overlay on the dashboard to easily trigger simulated alerts for testing.
