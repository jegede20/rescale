# Rescale

**Your recipe. Perfectly sized.**

Rescale is a privacy-first Recipe Scaler, Density-Aware Unit Converter, Ingredient Substitution Panel, USDA Nutrition Calculator, and Full-Screen Step-by-Step Cook Mode web application.

## Architecture

- **Frontend (`/frontend`)**: React 18 + Vite + TypeScript + Tailwind CSS + Radix / shadcn/ui + Framer Motion + Lucide React + `vite-plugin-pwa`
- **Backend (`/backend`)**: Python 3.11+ FastAPI with strictly 6 endpoints:
  - `POST /parse` — `ingredient-parser-nlp` structured ingredient extraction
  - `POST /scrape` — `recipe-scrapers` + Schema.org JSON-LD blog scraper
  - `POST /ocr` — `pytesseract` + optional Google Cloud Vision API fallback
  - `POST /voice` — Groq Whisper (`whisper-large-v3-turbo`, fallback `whisper-large-v3`)
  - `POST /ai-parse` — Groq active production model (`openai/gpt-oss-120b`, fallback chain `openai/gpt-oss-20b` → `qwen/qwen3.8-27b`, replacing decommissioned `llama-3.3-70b-versatile`)
  - `POST /nutrition` — USDA FoodData Central per-serving macro calculator

## Environment Variables & API Keys

Copy `backend/.env.example` to `backend/.env` (or add in your Render service dashboard):

```env
GROQ_API_KEY=gsk_...
GROQ_TEXT_MODEL=openai/gpt-oss-120b
GROQ_VOICE_MODEL=whisper-large-v3-turbo
USDA_API_KEY=...
GOOGLE_VISION_API_KEY=
```

In Vercel (Frontend), set:

```env
VITE_API_URL=https://your-rescale-backend.onrender.com
```
