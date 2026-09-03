# Aletheia.edu

Turn any curriculum into a black-and-white educational comic.  
Read → answer → get scored → get corrected when it matters.

**Stack (free):** Next.js · FastAPI · Supabase · Gemini (text) · SVG comics

---

## What it does

1. Pick a subject (seeded) **or upload a PDF**
2. Choose **genre** (tone + location) and **character archetype**
3. AI writes a fact-anchored comic chapter
4. Student answers a Socratic question
5. Rubric score + correction if understanding is weak
6. Story map progress → next chapter

---

## Setup

### 1. Supabase
- Create a project
- Run entire `supabase_schema.sql` in the SQL editor
- Auth → enable **Anonymous sign-ins**

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # or Windows equivalent
pip install -r requirements.txt
cp .env.example .env
# Fill:
#   SUPABASE_URL=
#   SUPABASE_KEY=   (service role key)
#   GOOGLE_API_KEY=
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill:
#   NEXT_PUBLIC_SUPABASE_URL=
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=
#   NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000

### Production
Set `ALLOWED_ORIGINS` on the backend to your frontend URL (comma-separated).

---

## Features

| Area | Detail |
|------|--------|
| Genres (8) | Fantasy, Noir, Sitcom, Historical, Space, Sports, Mythic Fable, Survival Horror |
| Genre locations | Unique ink scene per genre on the comic page |
| Genre safety | Blocks mismatched tones for sensitive subjects |
| Characters | 5 B&W archetypes (Alex, Jordan, Sam, Riley, Pixel) |
| Poses | Driven by learning emotion per panel |
| PDF → course | Extract topics + facts, preview before forge |
| Learning loop | Try again / continue on story map |
| Reader mode | Panel focus, keyboard, auto-play |
| Cost | $0 intended path (Gemini free text + SVG) |

---

## Demo path (recommended)

1. Landing → Begin  
2. Subject: Biology (or upload a short text PDF)  
3. Genre: Fantasy Quest  
4. Character: Alex  
5. Forge → wait for story map  
6. Read chapter 1 in Reader Mode  
7. Answer weakly → see correction → Try again  
8. Answer better → Continue on map  

Pre-generate chapter 2 once before recording if you want a longer demo.

---

## API overview

- `GET /api/curricula`
- `POST /api/curricula/from-pdf`
- `GET /api/curricula/{id}/allowed-genres`
- `POST /api/start-learning`
- `GET /api/session/{id}`
- `GET /api/session/{id}/status`
- `GET /api/session/{id}/chapter/{index}`
- `POST /api/session/{id}/generate-chapter/{index}`
- `POST /api/grade-answer`

---

## Notes

- Scanned (image-only) PDFs need OCR — not included on the free path. Use text PDFs.
- Live AI images per panel are intentionally not used (quota + demo risk).
- Re-running seed SQL may duplicate curricula rows — delete duplicates if needed.

---

## Honest backlog status

| Item | Status |
|------|--------|
| Email sign-in / sign-up | **Done** (`/login`) — enable Email provider in Supabase |
| Guest (anonymous) still works | **Done** |
| Saved course history | **Done** — dashboard “Your courses” |
| Mobile spacing / header | **Improved** |
| Clearer scanned-PDF error | **Done** |
| Live AI images per panel | **Not done** (keeps $0 + demo stable) |
| OCR for image-only PDFs | **Not done** (use text PDFs) |
| Full automated e2e with live Gemini | **Not done** (needs your API keys at runtime) |

Enable in Supabase for email auth: Authentication → Providers → Email.


## Deploy (minimal)

**Frontend (Vercel):** root `frontend/`, set env vars from `.env.local.example`.

**Backend (Railway / Render / Fly):** root `backend/`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`, set env from `.env.example`, set `ALLOWED_ORIGINS` to your Vercel URL.

**Supabase:** already hosted; enable Anonymous + Email providers.

## Batch 2 additions

- Skeleton loaders (story map + chapter)
- Copy chapter link (share)
- Explain more after low-score correction
- Genre letter marks on dashboard
- History curriculum seed
- Simple API rate limit (40 req/min/IP)
- Delete course + empty courses (batch 1)
