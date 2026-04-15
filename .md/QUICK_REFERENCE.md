# 🚀 Quick Reference Card

## Where is Skill Gap?

**Navigation Menu**: Dashboard → Assessment → **Skill Gap** → Blog → Careers

**URL**: `http://localhost:3000/skill-gap`

---

## Start Servers

### Backend
```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd apps/frontend
npm run dev
```

---

## Verify Setup

```bash
python verify_skill_gap.py
```

Expected output: ✓ All tests PASS

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/skill-gap/analyze` | Upload CV & analyze |
| GET | `/api/skill-gap/my-analyses` | List analyses |
| GET | `/api/skill-gap/analysis/{id}` | Get detail |
| GET | `/api/skill-gap/heatmap/{id}` | Get heatmap |
| GET | `/api/skill-gap/interview-prep/{id}` | Get AI prep |

---

## Database

**Connection**: `postgresql://postgres:123456@localhost:5433/career_ai`

**Table**: `core.skill_gap_analyses`

**Check table**:
```sql
SELECT * FROM core.skill_gap_analyses LIMIT 5;
```

---

## File Locations

### Backend
- Routes: `apps/backend/app/modules/skill_gap/routes.py`
- Service: `apps/backend/app/modules/skill_gap/service.py`
- Parser: `apps/backend/app/modules/skill_gap/cv_parser.py`

### Frontend
- Main page: `apps/frontend/src/pages/SkillGapPage.tsx`
- Upload: `apps/frontend/src/components/skillgap/CVUploadForm.tsx`
- Results: `apps/frontend/src/components/skillgap/SkillGapResult.tsx`

---

## Quick Test

1. Login: `http://localhost:3000/login`
2. Click: **Skill Gap** in menu
3. Upload: Sample PDF CV
4. Select: Target career
5. Click: **Analyze My Skills**
6. View: Results & heatmap

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't find menu | Refresh page (Ctrl+R) |
| Upload fails | Check file is PDF |
| No skills found | List skills clearly in CV |
| Import error | Run `python verify_skill_gap.py` |
| Database error | Check connection string |

---

## Color Codes

- 🟢 **Green**: Skills you have
- 🔴 **Red**: Critical gaps (must learn)
- 🟠 **Orange**: Important gaps (should learn)
- 🟡 **Yellow**: Nice-to-have (optional)

---

## Dependencies

### Backend
```bash
pip install PyPDF2 python-multipart
```

### Frontend
```bash
npm install
```

---

## Documentation

- **User Guide**: `SKILL_GAP_QUICK_START.md`
- **Technical**: `SKILL_GAP_IMPLEMENTATION.md`
- **Status**: `FINAL_STATUS.md`
- **Summary**: `CONTEXT_TRANSFER_SUMMARY.md`

---

## Status

✅ **Backend**: Operational (5 endpoints)
✅ **Frontend**: Operational (3 pages)
✅ **Database**: Connected & migrated
✅ **Tests**: All passing
✅ **Docs**: Complete

---

## Support

Run verification: `python verify_skill_gap.py`

Check logs:
- Backend: Terminal running uvicorn
- Frontend: Browser console (F12)
- Database: pgAdmin or psql

---

**Quick Access**: Click "Skill Gap" in navigation menu!
