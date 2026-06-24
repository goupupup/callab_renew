from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status

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


@router.get("/download")
def download_equipment_file(
    request: Request,
    id: str,
    type: str,
    calno: str = None,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    result = request.app.state.file_service.get_download(current_user, id.strip(), type.strip(), calno)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return Response(
        content=result.content,
        media_type=result.media_type,
        headers={"Content-Disposition": f'attachment; filename="{result.filename}"'},
    )


@router.post("/upload")
async def upload_equipment_file(
    request: Request,
    id: str = Form(...),
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    if current_user.role not in ("MASTER", "EMPLOYEE"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Elevated role required",
        )

    content = await file.read()
    return request.app.state.file_service.upload(current_user, id.strip(), file.filename, content)


@router.put("/{equipment_id}")
async def update_equipment(
    request: Request,
    equipment_id: str,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    if current_user.role not in ("MASTER", "EMPLOYEE"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Elevated role required",
        )

    payload = await request.json()
    result = request.app.state.equipment_service.update(current_user, equipment_id.strip(), payload)
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    return result
