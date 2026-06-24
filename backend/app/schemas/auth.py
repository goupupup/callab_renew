from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class CurrentUser(BaseModel):
    user_id: str
    name: str
    corp_id: str
    corp_name: str
    role: str


class LoginResponse(BaseModel):
    user: CurrentUser
