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


class AccountAccessRequest(BaseModel):
    email: str
    password: str
    userName: str
    contactEmail: str
    phone: str = ""
    companyName: str
    companyLocation: str


class AccountAccessApproval(BaseModel):
    userId: str
    corpId: str
    corpName: str
    authority: str = "U"
    corpType: str = "C"


class AccountAccessRejection(BaseModel):
    userId: str
