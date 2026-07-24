from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.agent import Agent
from app.models.user import User
from app.schemas import AgentOut, AgentUpdate
from app.services.policy_engine import dump_json_list, parse_json_list

router = APIRouter(prefix="/agents", tags=["agents"])


def _to_out(agent: Agent) -> AgentOut:
    remaining = max(agent.daily_budget - agent.current_usage, 0.0)
    return AgentOut(
        agent_id=agent.agent_id,
        name=agent.name,
        department=agent.department,
        description=agent.description,
        status=agent.status,
        risk_level=agent.risk_level,
        trust_score=agent.trust_score,
        permissions=parse_json_list(agent.permissions),
        daily_budget=agent.daily_budget,
        current_usage=agent.current_usage,
        request_count_today=agent.request_count_today,
        policy_id=agent.policy_id,
        budget_remaining=remaining,
        updated_at=agent.updated_at,
    )


@router.get("", response_model=list[AgentOut])
def list_agents(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[AgentOut]:
    agents = db.query(Agent).order_by(Agent.name).all()
    return [_to_out(a) for a in agents]


@router.get("/{agent_id}", response_model=AgentOut)
def get_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AgentOut:
    agent = db.query(Agent).filter(Agent.agent_id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _to_out(agent)


@router.patch("/{agent_id}", response_model=AgentOut)
def update_agent(
    agent_id: str,
    payload: AgentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AgentOut:
    agent = db.query(Agent).filter(Agent.agent_id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    data = payload.model_dump(exclude_unset=True)
    if "permissions" in data and data["permissions"] is not None:
        agent.permissions = dump_json_list(data.pop("permissions"))
    for key, value in data.items():
        setattr(agent, key, value)
    db.commit()
    db.refresh(agent)
    return _to_out(agent)
