from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser
from app.schemas.account import MyAccount, MyAccountUpdate

router = APIRouter(prefix="/api/accounts", tags=["accounts"])
my_account_router = APIRouter(prefix="/api/account", tags=["account"])


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


@my_account_router.get("", response_model=MyAccount)
def read_my_account(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    account = request.app.state.account_service.get_my_account(current_user)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


@my_account_router.put("")
def update_my_account(
    payload: MyAccountUpdate,
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    result = request.app.state.account_service.update_my_account(current_user, payload)
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error"))
    return result
