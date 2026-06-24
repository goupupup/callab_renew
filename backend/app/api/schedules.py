from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


def _require_elevated(user: CurrentUser):
    if user.role == "USER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Elevated role required")


def _require_master(user: CurrentUser):
    if user.role != "MASTER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master role required")


@router.get("")
def list_schedules(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_elevated(current_user)
    return request.app.state.schedule_service.list_schedules()


@router.get("/employees")
def list_schedule_employees(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_elevated(current_user)
    return request.app.state.schedule_service.list_employees()


@router.post("")
def create_schedule(
    payload: dict,
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    return request.app.state.schedule_service.create_schedule(payload)


@router.put("/{schedule_id}")
def update_schedule(
    schedule_id: str,
    payload: dict,
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    return request.app.state.schedule_service.update_schedule(schedule_id, payload)


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: str,
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_master(current_user)
    return request.app.state.schedule_service.delete_schedule(schedule_id)
