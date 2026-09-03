# Demo checklist (last hour)

## Env
- [ ] Supabase: Anonymous ON, Email optional ON
- [ ] `supabase_schema.sql` applied
- [ ] Backend `.env`: SUPABASE_URL, SUPABASE_KEY, GOOGLE_API_KEY
- [ ] Frontend `.env.local`: Supabase + BACKEND URL
- [ ] `ALLOWED_ORIGINS` includes frontend URL if deployed

## Smoke
- [ ] `cd backend && python test_smoke.py` → all pass
- [ ] Backend starts: `uvicorn main:app --reload --port 8000`
- [ ] Frontend: `npm run dev`

## Product path
- [ ] Landing → Begin
- [ ] Pick Biology → Fantasy Quest → Alex → Forge
- [ ] Story map loads
- [ ] Read chapter (Reader + Fullscreen)
- [ ] Weak answer → correction → Explain more → Try again
- [ ] Stronger answer → score on map
- [ ] Copy link / Print works
- [ ] Dashboard shows Your courses
- [ ] Optional: text PDF upload → topic preview

## Pitch
- [ ] Follow `PITCH_2MIN.md`
- [ ] Pre-generate chapter 2 if needed
