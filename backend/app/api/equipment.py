from fastapi import APIRouter, Depends, Request

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser
from app.schemas.equipment import EquipmentListResponse, EquipmentQuery

router = APIRouter(prefix="/api/equipment", tags=["equipment"])


@router.get("", response_model=EquipmentListResponse)
def list_equipment(
    request: Request,
    query: EquipmentQuery = Depends(),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    return request.app.state.equipment_service.search(current_user, query)
