from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models.scenario import Scenario
from app.middleware.auth import get_current_user


router = APIRouter()


class ScenarioResponse(BaseModel):
    id: str
    name: str
    description: str
    icon: str | None
    category: str
    formality_min: int
    formality_max: int
    style_notes: str | None


@router.get("/", response_model=list[ScenarioResponse])
async def list_scenarios(
    category: str | None = None,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Scenario).order_by(Scenario.sort_order)

    if category:
        query = query.where(Scenario.category == category)

    result = await db.execute(query)
    scenarios = result.scalars().all()

    return [
        ScenarioResponse(
            id=s.id, name=s.name, description=s.description,
            icon=s.icon, category=s.category,
            formality_min=s.formality_min, formality_max=s.formality_max,
            style_notes=s.style_notes,
        )
        for s in scenarios
    ]


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scenario not found")

    return ScenarioResponse(
        id=scenario.id, name=scenario.name, description=scenario.description,
        icon=scenario.icon, category=scenario.category,
        formality_min=scenario.formality_min, formality_max=scenario.formality_max,
        style_notes=scenario.style_notes,
    )