from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    q: str | None = Query(default=None, description="Search agent, action, decision, request"),
    decision: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[AuditLog]:
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    if decision:
        query = query.filter(AuditLog.decision == decision.upper())
    if q:
        like = f"%{q}%"
        query = query.filter(
            (AuditLog.agent_name.ilike(like))
            | (AuditLog.action.ilike(like))
            | (AuditLog.decision.ilike(like))
            | (AuditLog.request_id.ilike(like))
            | (AuditLog.agent_id.ilike(like))
            | (AuditLog.reason.ilike(like))
        )
    return query.limit(limit).all()
