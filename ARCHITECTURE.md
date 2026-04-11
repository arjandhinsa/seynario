# Seynario — Dress for the Scenario
## Architecture Reference

Part of the **SEYN** product family.
Seynse handles inner confidence. Seynario handles outer confidence.

---

## 1. What Seynario Does

Users scan their wardrobe by photographing clothes. The app identifies each item
(type, colour, style, season). Then for any scenario — job interview, first date,
wedding guest, casual Friday — Seynario recommends complete outfits mixing items
the user already owns with new pieces via affiliate links.

**Three core features:**

1. **Wardrobe Scanner** — Take a photo → AI identifies the garment (blue denim jacket,
   white cotton t-shirt, black slim trousers) → adds to digital wardrobe
2. **Scenario Outfits** — Pick a scenario → app recommends 2-3 complete outfits from
   your wardrobe + new pieces → explains WHY each works for that context
3. **Shop the Look** — New pieces link to affiliate partners (ASOS, Amazon Fashion) →
   user buys → you earn commission

---

## 2. Tech Stack

| Layer          | Technology              | Why                                              |
|----------------|-------------------------|--------------------------------------------------|
| Frontend       | React + Vite            | Same as Seynse — reuse patterns                  |
| Backend        | Python + FastAPI         | Same as Seynse — reuse auth, DB patterns         |
| Database       | SQLite (dev) / Postgres  | Relational data via SQLAlchemy                   |
| Auth           | JWT (shared with Seynse) | Same auth system, could share accounts later     |
| Image AI       | OpenAI GPT-4o (vision)   | Identifies garments from photos                  |
| Text AI        | OpenAI GPT-4o-mini       | Generates outfit recommendations + rationale     |
| Image Storage  | Cloudinary (free tier)   | Stores wardrobe photos, serves optimised images  |
| Affiliate Data | ASOS / Amazon API        | Product images, prices, affiliate links          |

---

## 3. Folder Structure

```
seynario/
├── .gitignore
├── .env.example
├── ARCHITECTURE.md
│
├── backend/
│   ├── requirements.txt
│   ├── .env
│   ├── main.py
│   ├── seed.py                     ← Seed scenarios + style rules
│   │
│   └── app/
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       │
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py             ← Same pattern as Seynse
│       │   ├── wardrobe.py         ← Garment items + photos
│       │   ├── outfit.py           ← Saved outfits + recommendations
│       │   └── scenario.py         ← Scenario definitions
│       │
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── auth.py             ← Register, login (reuse from Seynse)
│       │   ├── wardrobe.py         ← Upload photo, list items, delete
│       │   ├── outfits.py          ← Get recommendations, save/unsave
│       │   ├── scenarios.py        ← List scenarios, filter
│       │   └── shop.py             ← Affiliate product search
│       │
│       ├── services/
│       │   ├── __init__.py
│       │   ├── auth_service.py     ← Reuse from Seynse
│       │   ├── vision.py           ← Sends photo to GPT-4o vision
│       │   ├── stylist.py          ← Generates outfit recommendations
│       │   ├── image_store.py      ← Cloudinary upload/delete
│       │   └── affiliate.py        ← ASOS/Amazon product search
│       │
│       └── middleware/
│           ├── __init__.py
│           └── auth.py             ← Reuse from Seynse
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── LoginScreen.jsx      ← Reuse pattern from Seynse
        │   ├── HomeScreen.jsx       ← Wardrobe overview + scenario picker
        │   ├── WardrobeScreen.jsx   ← Grid of garment photos
        │   ├── ScanScreen.jsx       ← Camera/upload + AI identification
        │   ├── ScenarioScreen.jsx   ← Pick a scenario, see outfit recs
        │   ├── OutfitDetail.jsx     ← Full outfit view + shop links
        │   └── GarmentCard.jsx      ← Single wardrobe item display
        ├── hooks/
        │   └── useAuth.jsx          ← Reuse from Seynse
        ├── services/
        │   └── api.js               ← Reuse pattern from Seynse
        └── styles/
            └── globals.css
```

---

## 4. Database Schema (5 tables)

```
users
├── id              VARCHAR(36)  PK
├── email           VARCHAR(255) UNIQUE
├── hashed_password VARCHAR(255)
├── display_name    VARCHAR(100) NULL
├── body_type       VARCHAR(50)  NULL    ← "athletic", "slim", "curvy", etc.
├── style_pref      VARCHAR(50)  NULL    ← "minimal", "streetwear", "classic", etc.
├── gender          VARCHAR(20)  NULL    ← For gendered recommendations
├── created_at      DATETIME
└── updated_at      DATETIME

garments
├── id              VARCHAR(36)  PK
├── user_id         VARCHAR(36)  FK → users.id
├── image_url       VARCHAR(500)         ← Cloudinary URL of the photo
├── category        VARCHAR(50)          ← "top", "bottom", "outerwear", "footwear", "accessory"
├── subcategory     VARCHAR(100)         ← "t-shirt", "blazer", "jeans", "trainers", etc.
├── colour          VARCHAR(50)          ← "navy", "white", "black", etc.
├── pattern         VARCHAR(50)  NULL    ← "solid", "striped", "checked", "floral"
├── material        VARCHAR(100) NULL    ← "cotton", "denim", "wool", "leather"
├── season          VARCHAR(50)  NULL    ← "all", "summer", "winter", "transitional"
├── formality       INTEGER              ← 1-5 (1=very casual, 5=very formal)
├── ai_description  TEXT         NULL    ← Full AI-generated description
├── created_at      DATETIME
└── sort_order      INTEGER

scenarios
├── id              VARCHAR(36)  PK
├── name            VARCHAR(200)         ← "Job Interview", "First Date", "Wedding Guest"
├── description     TEXT
├── formality_min   INTEGER              ← Minimum formality level needed
├── formality_max   INTEGER              ← Maximum formality level
├── style_notes     TEXT                 ← AI prompt context for this scenario
├── icon            VARCHAR(10)          ← Emoji
├── category        VARCHAR(50)          ← "professional", "social", "formal", "casual"
└── sort_order      INTEGER

outfits
├── id              VARCHAR(36)  PK
├── user_id         VARCHAR(36)  FK → users.id
├── scenario_id     VARCHAR(36)  FK → scenarios.id
├── name            VARCHAR(200) NULL    ← AI-generated outfit name
├── rationale       TEXT                 ← WHY this works for the scenario
├── is_saved        BOOLEAN      DEFAULT false
├── created_at      DATETIME
│
└── outfit_items (child table)
    ├── id              VARCHAR(36)  PK
    ├── outfit_id       VARCHAR(36)  FK → outfits.id
    ├── garment_id      VARCHAR(36)  FK → garments.id  NULL  ← From wardrobe
    ├── affiliate_url   VARCHAR(500) NULL                    ← External product
    ├── affiliate_image VARCHAR(500) NULL
    ├── affiliate_name  VARCHAR(200) NULL
    ├── affiliate_price VARCHAR(20)  NULL
    ├── position        VARCHAR(50)                          ← "top", "bottom", "shoes", etc.
    └── is_owned        BOOLEAN      DEFAULT true            ← true = from wardrobe, false = affiliate
```

---

## 5. API Contract

### Auth (reuse from Seynse)
```
POST /api/auth/register       → { access_token, refresh_token }
POST /api/auth/login          → { access_token, refresh_token }
POST /api/auth/refresh        → { access_token, refresh_token }
GET  /api/auth/me             → { id, email, display_name, body_type, style_pref, gender }
PUT  /api/auth/me             → Update profile (body_type, style_pref, gender)
```

### Wardrobe
```
POST /api/wardrobe/scan                       [Protected, multipart/form-data]
  Request:  photo file (jpg/png)
  Response: {
    id, image_url, category, subcategory, colour, pattern,
    material, season, formality, ai_description
  }
  Flow: Upload photo → Cloudinary → GPT-4o vision identifies it → save to DB
  Status: 201 Created

GET /api/wardrobe/                            [Protected]
  Query: ?category=top&season=summer
  Response: [{ id, image_url, category, subcategory, colour, formality, ... }]

GET /api/wardrobe/{id}                        [Protected]
  Response: { full garment details }

DELETE /api/wardrobe/{id}                     [Protected]
  Flow: Delete from Cloudinary + DB
  Status: 204

PUT /api/wardrobe/{id}                        [Protected]
  Request: { category, subcategory, colour, ... }  ← Manual corrections
  Response: { updated garment }
```

### Scenarios
```
GET /api/scenarios/                           [Protected]
  Query: ?category=professional
  Response: [{ id, name, description, icon, category, formality_min, formality_max }]

GET /api/scenarios/{id}                       [Protected]
  Response: { full scenario details }
```

### Outfits
```
POST /api/outfits/recommend                   [Protected]
  Request:  { scenario_id: str, budget?: int, style_preference?: str }
  Response: {
    outfits: [
      {
        id, name, rationale,
        items: [
          { garment_id?, image_url, name, position, is_owned, affiliate_url?, price? }
        ]
      }
    ]
  }
  Flow:
    1. Load user's wardrobe
    2. Load scenario requirements
    3. Send to GPT-4o-mini: "Given this wardrobe and this scenario, recommend 2-3 outfits"
    4. For gaps (user doesn't own suitable shoes), search affiliate API
    5. Return complete outfits with mix of owned + shoppable items

GET /api/outfits/                             [Protected]
  Query: ?saved=true
  Response: [{ id, name, scenario_id, created_at, item_count }]

GET /api/outfits/{id}                         [Protected]
  Response: { full outfit with items }

POST /api/outfits/{id}/save                   [Protected]
  Status: 200

DELETE /api/outfits/{id}/save                 [Protected]
  Status: 204
```

### Shop (affiliate products)
```
GET /api/shop/search                          [Protected]
  Query: ?query=navy+blazer&budget=100&gender=male
  Response: [{ name, image_url, price, affiliate_url, retailer }]
```

---

## 6. Wardrobe Scan Flow (the computer vision part)

```
User takes photo of garment
        │
        ▼
Frontend: POST /api/wardrobe/scan (multipart form with image)
        │
        ▼
Backend:
  1. Upload image to Cloudinary → get URL
  2. Send image to GPT-4o vision with prompt:
     "Identify this garment. Return JSON with:
      category, subcategory, colour, pattern, material,
      season, formality (1-5), description"
  3. Parse the JSON response
  4. Save garment record to DB with image_url + AI data
  5. Return the complete garment object
        │
        ▼
Frontend: Shows identified garment with editable fields
          (user can correct if AI got something wrong)
```

**The GPT-4o vision prompt is critical.** Example:

```
You are a fashion expert analysing a photo of a clothing item.
Identify the garment and return ONLY a JSON object with:
{
  "category": "top|bottom|outerwear|footwear|accessory",
  "subcategory": "specific type e.g. oxford shirt, slim jeans, chelsea boots",
  "colour": "primary colour",
  "pattern": "solid|striped|checked|floral|graphic|other",
  "material": "best guess of fabric",
  "season": "summer|winter|transitional|all",
  "formality": 1-5 (1=very casual like gym wear, 5=very formal like a suit),
  "description": "one sentence description"
}
```

GPT-4o vision costs $2.50/1M input tokens. A single image is roughly 1,000 tokens.
So scanning one garment costs about $0.003 — less than half a penny.

---

## 7. Outfit Recommendation Flow

```
User picks "Job Interview" scenario
        │
        ▼
Frontend: POST /api/outfits/recommend { scenario_id, budget: 150 }
        │
        ▼
Backend:
  1. Load user's full wardrobe from DB
  2. Load scenario (Job Interview: formality 4-5, style_notes: "...")
  3. Build prompt for GPT-4o-mini:
     "Here is this person's wardrobe: [list of garments with attributes].
      They have a job interview. Recommend 2-3 complete outfits.
      Use their existing pieces where possible.
      For any gaps, describe what they need to buy.
      Explain WHY each outfit works for this scenario."
  4. Parse AI response into structured outfits
  5. For each "gap" item → search affiliate API for matching products
  6. Save outfits to DB
  7. Return outfits with mix of owned items + affiliate suggestions
        │
        ▼
Frontend: Shows 2-3 outfit cards, each with:
  - Visual grid of the items (photos from wardrobe + product images)
  - Rationale ("The navy blazer signals authority...")
  - "Shop" buttons on items they don't own (affiliate links)
  - "Save outfit" button
```

---

## 8. Monetisation — Affiliate Links

**ASOS Affiliate Programme:**
- Sign up at asos.com/affiliate
- Commission: ~5-7% on sales
- API access for product search
- Good UK coverage, strong with 18-35 demographic

**Amazon Associates:**
- Sign up at affiliate-program.amazon.co.uk
- Commission: 1-10% depending on category (fashion ~4%)
- Product Advertising API for search
- Massive catalogue but less fashion-focused

**How it works in the app:**
- User sees an outfit recommendation
- 2 of 4 items are from their wardrobe (free)
- 2 items are affiliate suggestions with "Shop" buttons
- User clicks → goes to ASOS/Amazon → buys → you get commission
- Track clicks and conversions in your DB for analytics

**Revenue estimate:**
- 1,000 users, 20% click an affiliate link monthly = 200 clicks
- 5% conversion rate = 10 purchases
- Average order £50, 5% commission = £2.50 per sale
- Monthly revenue: ~£25
- At 10,000 users: ~£250/month
- Not life-changing but proves the model for investors/employers

---

## 9. What You Can Reuse from Seynse

Copy these files directly and rename:
- `config.py` — change app name, add Cloudinary keys
- `database.py` — identical
- `auth_service.py` — identical
- `middleware/auth.py` — identical
- `routes/auth.py` — identical
- `useAuth.jsx` — identical
- `api.js` — change BASE_URL
- `globals.css` — change colour palette
- `LoginScreen.jsx` — change branding

That saves you roughly a full day of work.

---

## 10. Environment Variables (.env)

```
DATABASE_URL=sqlite+aiosqlite:///./seynario.db
SECRET_KEY=<generate new one>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
OPENAI_API_KEY=<same key as Seynse>
OPENAI_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o
CLOUDINARY_CLOUD_NAME=<from cloudinary.com>
CLOUDINARY_API_KEY=<from cloudinary.com>
CLOUDINARY_API_SECRET=<from cloudinary.com>
ASOS_AFFILIATE_ID=<from asos affiliate programme>
APP_NAME=Seynario
APP_ENV=development
CORS_ORIGINS=http://localhost:5173
```

---

## 11. Build Order

```
Week 1: Foundation + Wardrobe Scanner
  1. Copy reusable files from Seynse (config, auth, database)
  2. Models: user, garment, scenario
  3. Cloudinary setup + image_store.py service
  4. Vision service (GPT-4o garment identification)
  5. Wardrobe routes (scan, list, delete, edit)
  6. Frontend: scan screen with camera/upload
  7. Frontend: wardrobe grid showing scanned items

Week 2: Recommendations + Scenarios
  8. Scenario model + seed data (10-15 scenarios)
  9. Stylist service (GPT-4o-mini outfit generation)
  10. Outfit model + routes
  11. Frontend: scenario picker screen
  12. Frontend: outfit recommendation display

Week 3: Affiliate Integration + Polish
  13. Affiliate API integration (ASOS or Amazon)
  14. Shop routes (product search)
  15. Frontend: "Shop the look" with affiliate links
  16. Frontend: saved outfits screen
  17. UI polish, deploy to Render + Vercel

---

## 12. API Cost Estimate

| Action              | Model      | Tokens     | Cost per call |
|---------------------|------------|------------|---------------|
| Scan 1 garment      | GPT-4o     | ~1,500     | ~$0.004       |
| Recommend outfits   | GPT-4o-mini| ~3,000     | ~$0.002       |

At 100 users scanning 20 items each + 5 recommendations/month:
- Scanning: 2,000 calls × $0.004 = $8/month
- Recommendations: 500 calls × $0.002 = $1/month
- Total: ~$9/month

Very affordable. The vision calls (scanning) are the main cost,
but they're one-time per garment — once scanned, it's in the DB forever.
```
