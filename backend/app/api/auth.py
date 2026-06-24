from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.security import create_session_token, current_user_from_request
from app.schemas.auth import CurrentUser, LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, response: Response):
    auth_service = request.app.state.auth_service
    try:
        user = auth_service.authenticate(payload.username, payload.password)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ID or password",
        )

    settings = request.app.state.settings
    token = create_session_token(user, settings)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_max_age_seconds,
        httponly=True,
        secure=False,
        samesite="lax",
    )
    return LoginResponse(user=user)


@router.get("/me", response_model=CurrentUser)
def read_current_user(current_user: CurrentUser = Depends(current_user_from_request)):
    return current_user


@router.post("/logout")
def logout(request: Request, response: Response):
    settings = request.app.state.settings
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"success": True}
