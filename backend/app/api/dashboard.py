from fastapi import APIRouter, Depends, Request

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def read_dashboard_stats(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    return request.app.state.dashboard_service.get_stats(current_user)
