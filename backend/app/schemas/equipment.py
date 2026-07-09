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
    returnDateStart: str = ""
    returnDateEnd: str = ""
    onGoingOnly: bool = False
    expirationOnly: bool = False


class CertDownloadQuery(BaseModel):
    company: str = ""
    regNo: str = ""
    equipmentName: str = ""
    modelName: str = ""
    manufacturer: str = ""
    calDateStart: str = ""
    calDateEnd: str = ""
    returnDateStart: str = ""
    returnDateEnd: str = ""
    limit: int = Field(default=500, ge=1, le=2000)


class HistoryQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=25, ge=1)
    searchType: str = "regNo"
    keyword: str = ""


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
    CIDU: str = ""
    MANUFACTURER_NAME: str = ""
    CUSTOMER_NAME: str = ""


class CertDownloadItem(BaseModel):
    ISID: str
    CIDU: str = ""
    ACCN: str = ""
    NAEM_SUP: str = ""
    MODL: str = ""
    SERN: str = ""
    CUSTOMER_NAME: str = ""
    MANUFACTURER_NAME: str = ""
    CAL_DATE: str = ""
    RETURN_DATE: str = ""


class CertDownloadSearchResponse(BaseModel):
    data: List[CertDownloadItem]
    total: int
    limit: int


class BulkDownloadItem(BaseModel):
    ISID: str
    CIDU: str = ""


class BulkDownloadRequest(BaseModel):
    type: str
    items: List[BulkDownloadItem] = Field(default_factory=list, max_length=200)


class EquipmentPagination(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int


class EquipmentListResponse(BaseModel):
    data: List[EquipmentItem]
    pagination: EquipmentPagination


class HistoryListResponse(BaseModel):
    data: List[CertDownloadItem]
    pagination: EquipmentPagination
