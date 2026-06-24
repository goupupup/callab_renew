from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.security import current_user_from_request
from app.schemas.auth import CurrentUser
from app.schemas.search import SearchLookups

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/lookups", response_model=SearchLookups)
def read_search_lookups(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    if current_user.role == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Elevated role required",
        )
    return request.app.state.search_service.get_lookups()


def _require_elevated(current_user: CurrentUser):
    if current_user.role == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Elevated role required",
        )


@router.get("/reg-no")
def search_reg_no(
    request: Request,
    q: str = Query(...),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_elevated(current_user)
    return request.app.state.search_service.search_reg_no(current_user, q)


@router.get("/cal-no")
def search_cal_no(
    request: Request,
    q: str = Query(...),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_elevated(current_user)
    return request.app.state.search_service.search_cal_no(current_user, q)


@router.get("/model")
def search_model(
    request: Request,
    q: str = Query(...),
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_elevated(current_user)
    return request.app.state.search_service.search_model(current_user, q)


@router.get("/ongoing")
def search_ongoing(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_elevated(current_user)
    return request.app.state.search_service.search_ongoing(
        current_user,
        dict(request.query_params),
    )


@router.get("/expirations")
def search_expirations(
    request: Request,
    current_user: CurrentUser = Depends(current_user_from_request),
):
    _require_elevated(current_user)
    return request.app.state.search_service.search_expirations(
        current_user,
        dict(request.query_params),
    )
