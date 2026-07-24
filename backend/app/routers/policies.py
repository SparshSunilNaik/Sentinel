from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.policy import Policy
from app.models.user import User
from app.schemas import PolicyOut, PolicyUpdate
from app.services.policy_engine import dump_json_list, parse_json_list, policy_to_dict

router = APIRouter(prefix="/policies", tags=["policies"])


def _to_out(policy: Policy) -> PolicyOut:
    data = policy_to_dict(policy)
    return PolicyOut(**data)


@router.get("", response_model=list[PolicyOut])
def list_policies(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[PolicyOut]:
    policies = db.query(Policy).order_by(Policy.name).all()
    return [_to_out(p) for p in policies]


@router.get("/{policy_id}", response_model=PolicyOut)
def get_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PolicyOut:
    policy = db.query(Policy).filter(Policy.policy_id == policy_id).first()
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    return _to_out(policy)


@router.patch("/{policy_id}", response_model=PolicyOut)
def update_policy(
    policy_id: str,
    payload: PolicyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PolicyOut:
    policy = db.query(Policy).filter(Policy.policy_id == policy_id).first()
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")

    data = payload.model_dump(exclude_unset=True)
    if "allowed_actions" in data and data["allowed_actions"] is not None:
        policy.allowed_actions = dump_json_list(data.pop("allowed_actions"))
    if "allowed_departments" in data and data["allowed_departments"] is not None:
        policy.allowed_departments = dump_json_list(data.pop("allowed_departments"))
    for key, value in data.items():
        setattr(policy, key, value)
    policy.version += 1
    db.commit()
    db.refresh(policy)
    return _to_out(policy)
