from typing import List, Optional

from pydantic import BaseModel, Field


class EquipmentQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=25, ge=1)
    sortBy: str = "regDate"
    order: str = "desc"
    serialNumber: str = ""
    assetNo: str = ""
    regNo: str = ""
    modelName: str = ""
    equipmentName: str = ""
    company: str = ""
    manufacturer: str = ""
    lastCalStart: str = ""
    lastCalEnd: str = ""
    nextCalStart: str = ""
    nextCalEnd: str = ""
    onGoingOnly: bool = False
    expirationOnly: bool = False


class EquipmentItem(BaseModel):
    ISID: str
    ACCN: str = ""
    SERN: str = ""
    MODL: str = ""
    NAEM_SUP: str = ""
    MNFC: str = ""
    REGD: str = ""
    LAST: str = ""
    NEXT: str = ""
    STAT: str = ""
    MANUFACTURER_NAME: str = ""
    CUSTOMER_NAME: str = ""


class EquipmentPagination(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int


class EquipmentListResponse(BaseModel):
    data: List[EquipmentItem]
    pagination: EquipmentPagination
