from fastapi import APIRouter, Depends, Request, Response

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser
from app.schemas.equipment import EquipmentListResponse, EquipmentQuery
from app.services.excel_export_service import (
    build_equipment_export_xlsx,
    equipment_export_filename,
)

router = APIRouter(prefix="/api/equipment", tags=["equipment"])


@router.get("", response_model=EquipmentListResponse)
def list_equipment(
    request: Request,
    query: EquipmentQuery = Depends(),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    return request.app.state.equipment_service.search(current_user, query)


@router.get("/export")
def export_equipment(
    request: Request,
    query: EquipmentQuery = Depends(),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    query.limit = 9999
    result = request.app.state.equipment_service.search(current_user, query)
    content = build_equipment_export_xlsx(result.data)
    filename = equipment_export_filename()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
