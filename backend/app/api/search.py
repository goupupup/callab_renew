from fastapi import APIRouter, Depends, HTTPException, Request, status

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
