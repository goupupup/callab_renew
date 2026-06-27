from typing import Optional

from pydantic import BaseModel


class MyAccount(BaseModel):
    userId: str
    userName: str
    corpId: str
    corpName: str
    telNo: str
    email: str


class MyAccountUpdate(BaseModel):
    telNo: str = ""
    email: str = ""
    currentPassword: Optional[str] = None
    password: Optional[str] = None
