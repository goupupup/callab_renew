from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser
from app.schemas.equipment import (
    BulkDownloadRequest,
    CertDownloadQuery,
    EquipmentListResponse,
    EquipmentQuery,
    HistoryListResponse,
    HistoryQuery,
)
from app.services.excel_export_service import (
    build_equipment_export_xlsx,
    build_history_export_xlsx,
    equipment_export_filename,
    history_export_filename,
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


@router.get("/cert-download/search")
def search_cert_downloads(
    request: Request,
    query: CertDownloadQuery = Depends(),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    return request.app.state.equipment_service.search_cert_downloads(current_user, query)


@router.get("/history", response_model=HistoryListResponse)
def search_history(
    request: Request,
    query: HistoryQuery = Depends(),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    return request.app.state.equipment_service.search_history(current_user, query)


@router.get("/history/export")
def export_history(
    request: Request,
    query: HistoryQuery = Depends(),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    result = request.app.state.equipment_service.search_history(current_user, query)
    content = build_history_export_xlsx(result.data)
    filename = history_export_filename()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/cert-download/bulk")
def bulk_download_equipment_files(
    request: Request,
    type: str,
    query: CertDownloadQuery = Depends(),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    if type not in ("report", "data"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid download type")
    if hasattr(request.app.state.file_service, "is_configured") and not request.app.state.file_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FTP download is not configured",
        )

    result = request.app.state.equipment_service.search_cert_downloads(current_user, query)
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching calibration records")

    archive = request.app.state.file_service.get_bulk_download(current_user, type, result.data)
    return Response(
        content=archive.content,
        media_type=archive.media_type,
        headers={"Content-Disposition": f'attachment; filename="{archive.filename}"'},
    )


@router.post("/cert-download/bulk")
async def bulk_download_selected_equipment_files(
    request: Request,
    payload: BulkDownloadRequest,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    if payload.type not in ("report", "data"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid download type")
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No equipment rows selected")
    if len(payload.items) > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bulk download is limited to 200 rows at a time",
        )
    if hasattr(request.app.state.file_service, "is_configured") and not request.app.state.file_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FTP download is not configured",
        )

    archive = request.app.state.file_service.get_bulk_download(current_user, payload.type, payload.items)
    return Response(
        content=archive.content,
        media_type=archive.media_type,
        headers={"Content-Disposition": f'attachment; filename="{archive.filename}"'},
    )


@router.get("/download")
def download_equipment_file(
    request: Request,
    id: str,
    type: str,
    calno: str = None,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    if hasattr(request.app.state.file_service, "is_configured") and not request.app.state.file_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FTP download is not configured",
        )

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
