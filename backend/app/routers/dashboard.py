from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas import DashboardMetrics, KillSwitchRequest, KillSwitchState, SettingsOut
from app.services.dashboard_service import get_dashboard_metrics, get_kill_switch, set_kill_switch

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/metrics", response_model=DashboardMetrics)
def dashboard_metrics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardMetrics:
    return get_dashboard_metrics(db)


@router.get("/kill-switch", response_model=KillSwitchState)
def read_kill_switch(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> KillSwitchState:
    return get_kill_switch(db)


@router.post("/kill-switch", response_model=KillSwitchState)
def update_kill_switch(
    payload: KillSwitchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> KillSwitchState:
    return set_kill_switch(
        db,
        active=payload.active,
        reason=payload.reason,
        operator=user.email,
    )


@router.get("/settings", response_model=SettingsOut)
def get_settings_info(
    _: User = Depends(get_current_user),
) -> SettingsOut:
    settings = get_settings()
    return SettingsOut(
        app_name=settings.app_name,
        app_version=settings.app_version,
        operator_email=settings.default_operator_email,
    )
