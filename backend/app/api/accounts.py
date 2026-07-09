from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser
from app.schemas.account import (
    AccountAccessApproval,
    AccountAccessRejection,
    AccountAccessRequest,
    MyAccount,
    MyAccountUpdate,
)

router = APIRouter(prefix="/api/accounts", tags=["accounts"])
my_account_router = APIRouter(prefix="/api/account", tags=["account"])
account_requests_router = APIRouter(prefix="/api/account-requests", tags=["account-requests"])


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


@account_requests_router.post("")
def create_account_request(payload: AccountAccessRequest, request: Request):
    result = request.app.state.account_service.create_access_request(payload)
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error"))
    return result


@account_requests_router.get("")
def list_account_requests(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    return request.app.state.account_service.list_access_requests()


@account_requests_router.get("/customers")
def search_customer_companies(
    q: str,
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    return request.app.state.account_service.search_customer_companies(q)


@account_requests_router.put("/approve")
def approve_account_request(
    payload: AccountAccessApproval,
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    result = request.app.state.account_service.approve_access_request(payload)
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error"))
    return result


@account_requests_router.delete("/reject")
def reject_account_request(
    payload: AccountAccessRejection,
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    result = request.app.state.account_service.reject_access_request(payload)
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error"))
    return result


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
