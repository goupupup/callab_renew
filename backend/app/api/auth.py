from fastapi import APIRouter, Depends

from app.core.security import require_current_user
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUser)
def read_current_user(current_user: CurrentUser = Depends(require_current_user)):
    return current_user
