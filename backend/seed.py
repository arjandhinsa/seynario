import asyncio
from app.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.wardrobe import Garment
from app.models.outfit import Outfit, OutfitItem
from app.models.scenario import Scenario


SCENARIOS = [
    # --- Professional ---
    {
        "name": "Job Interview",
        "description": "Make a strong first impression. Smart, polished, and confident without being overdressed.",
        "icon": "💼",
        "category": "professional",
        "formality_min": 4,
        "formality_max": 5,
        "style_notes": "Smart professional. Avoid loud patterns. Stick to neutral tones with one accent piece. Fit is everything — nothing too tight or too loose. Shoes must be clean.",
    },
    {
        "name": "Networking Event",
        "description": "Approachable but professional. You want people to remember you for the right reasons.",
        "icon": "🤝",
        "category": "professional",
        "formality_min": 3,
        "formality_max": 4,
        "style_notes": "Smart-casual to business casual. A blazer with no tie works well. Add one conversation-starter piece — a watch, interesting shoes, or a subtle pattern.",
    },
    {
        "name": "Presentation / Public Speaking",
        "description": "Command the room. Your outfit should project authority and competence.",
        "icon": "🎤",
        "category": "professional",
        "formality_min": 4,
        "formality_max": 5,
        "style_notes": "Structured pieces that hold their shape on stage. Solid colours photograph and project better than patterns. Avoid anything that might distract — keep accessories minimal.",
    },
    {
        "name": "First Day at Work",
        "description": "Match the company culture but slightly overdress. Better to dial it back tomorrow than undershoot on day one.",
        "icon": "🏢",
        "category": "professional",
        "formality_min": 3,
        "formality_max": 5,
        "style_notes": "Research the company dress code. When in doubt, smart-casual with clean shoes. Avoid anything too trendy — classic pieces signal reliability.",
    },

    # --- Social ---
    {
        "name": "First Date",
        "description": "Look like you made an effort but didn't try too hard. Confidence is the best accessory.",
        "icon": "❤️",
        "category": "social",
        "formality_min": 2,
        "formality_max": 4,
        "style_notes": "Wear something that makes YOU feel confident and comfortable. Slightly elevated from your everyday look. Choose colours that complement your skin tone.",
    },
    {
        "name": "Meeting Their Parents",
        "description": "Respectful, put-together, and approachable. Show them you care enough to dress well.",
        "icon": "👨‍👩‍👧",
        "category": "social",
        "formality_min": 3,
        "formality_max": 4,
        "style_notes": "Conservative but not boring. Clean, well-fitted basics. No graphic tees, ripped jeans, or flashy logos. Smart-casual, warm, approachable.",
    },
    {
        "name": "Night Out",
        "description": "Look your best for a night with friends. Express yourself and have fun with your outfit.",
        "icon": "🎉",
        "category": "social",
        "formality_min": 2,
        "formality_max": 3,
        "style_notes": "Bold and expressive. This is where you can experiment, go for interesting textures, bolder colours, statement pieces. Layers work well as venues vary in temperature. Dress for confidence on the dance floor.",
    },
    {
        "name": "Brunch with Friends",
        "description": "Effortlessly cool. Relaxed but curated.",
        "icon": "☕",
        "category": "social",
        "formality_min": 1,
        "formality_max": 2,
        "style_notes": "Casual, clean, laid-back. Think well-fitting jeans, a quality tee or light knit, clean trainers.  The vibe is 'I didn't try hard but I look great'.",
    },

    # --- Formal ---
    {
        "name": "Wedding Guest",
        "description": "Celebrate the couple. Dress for the venue and time of day, and remember to never upstage the wedding party.",
        "icon": "💒",
        "category": "formal",
        "formality_min": 4,
        "formality_max": 5,
        "style_notes": "Check the dress code on the invite. Daytime weddings are lighter in colour and fabric. Evening weddings can go darker and more structured. Avoid white, cream, or anything bridal. Suit and tie is safe; for women, a midi dress or tailored jumpsuit works well.",
    },
    {
        "name": "Black Tie Event",
        "description": "Full formal. This is the one occasion where overdressing is impossible.",
        "icon": "🎩",
        "category": "formal",
        "formality_min": 5,
        "formality_max": 5,
        "style_notes": "Tuxedo or dinner suit for men. Floor-length or cocktail dress for women. Stick to black, navy, or deep jewel tones. Polished shoes are non-negotiable. Minimal but quality accessories.",
    },
    {
        "name": "Graduation Ceremony",
        "description": "A milestone moment. Look sharp under the gown and ready for photos.",
        "icon": "🎓",
        "category": "formal",
        "formality_min": 3,
        "formality_max": 4,
        "style_notes": "You'll be wearing a gown so focus on what's visible — neckline, shoes, and what you'll wear at the after-celebration. Smart trousers and a crisp shirt work well. Comfortable shoes — you'll be standing for a long time.",
    },

    # --- Casual ---
    {
        "name": "Weekend Errand Run",
        "description": "You might bump into anyone. Look put-together without overthinking it.",
        "icon": "🛒",
        "category": "casual",
        "formality_min": 1,
        "formality_max": 2,
        "style_notes": "The trick is having a 'uniform' — go-to pieces that always look good together. Clean jeans or chinos, a simple top, decent shoes (not battered trainers). Looking good with zero effort is a skill.",
    },
    {
        "name": "Gym / Active Day",
        "description": "Functional first, but there's no reason you can't look good while working out.",
        "icon": "💪",
        "category": "casual",
        "formality_min": 1,
        "formality_max": 1,
        "style_notes": "Performance fabrics that wick moisture. Coordinate colours — matching sets look more intentional. Clean trainers make everything look better. Avoid cotton for intense workouts — it holds sweat.",
    },
    {
        "name": "Travel Day",
        "description": "Comfortable enough for the journey, sharp enough for the arrival. ",
        "icon": "✈️",
        "category": "casual",
        "formality_min": 1,
        "formality_max": 2,
        "style_notes": "Layers are essential — planes are cold, destinations might be warm. Slip-on shoes for security. Stretchy fabrics that don't wrinkle. A good jacket ties the whole look together. Avoid anything too tight for long sits.",
    },
]


async def seed_scenarios():
    async with SessionLocal() as session:
        from sqlalchemy import select, func
        result = await session.execute(select(func.count(Scenario.id)))
        existing = result.scalar() or 0

        if existing > 0:
            print(f"Already seeded ({existing} scenarios). Delete seynario.db to re-seed.")
            return

        for i, s in enumerate(SCENARIOS):
            session.add(Scenario(
                name=s["name"],
                description=s["description"],
                icon=s["icon"],
                category=s["category"],
                formality_min=s["formality_min"],
                formality_max=s["formality_max"],
                style_notes=s["style_notes"],
                sort_order=i,
            ))

        await session.commit()
        print(f"Seeded {len(SCENARIOS)} scenarios")


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_scenarios()


if __name__ == "__main__":
    asyncio.run(main())