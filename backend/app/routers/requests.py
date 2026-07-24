from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.request import AgentRequest
from app.models.user import User
from app.schemas import ApprovalAction, RequestCreate, RequestOut
from app.services.decision_engine import evaluate_request, resolve_escalation, serialize_request

router = APIRouter(prefix="/requests", tags=["requests"])


@router.get("", response_model=list[RequestOut])
def list_requests(
    status: str | None = Query(default=None),
    agent_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[RequestOut]:
    q = db.query(AgentRequest).order_by(AgentRequest.created_at.desc())
    if status:
        q = q.filter(AgentRequest.status == status.upper())
    if agent_id:
        q = q.filter(AgentRequest.agent_id == agent_id)
    rows = q.limit(limit).all()
    return [serialize_request(r) for r in rows]


@router.get("/{request_id}", response_model=RequestOut)
def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> RequestOut:
    req = db.query(AgentRequest).filter(AgentRequest.request_id == request_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Request not found")
    return serialize_request(req)


@router.post("/evaluate", response_model=RequestOut)
def create_and_evaluate(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> RequestOut:
    return evaluate_request(db, payload)


@router.post("/{request_id}/resolve", response_model=RequestOut)
def resolve_request(
    request_id: str,
    payload: ApprovalAction,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RequestOut:
    try:
        return resolve_escalation(
            db,
            request_id,
            approve=payload.approve,
            operator=user.email,
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
