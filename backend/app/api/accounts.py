from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _require_master(user: CurrentUser):
    if user.role != "MASTER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master role required")


@router.get("")
def list_accounts(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    return request.app.state.account_service.list_accounts()


@router.post("")
def create_account(
    payload: dict,
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    return request.app.state.account_service.create_account(payload)
