from typing import List, Optional

from pydantic import BaseModel


class CompanyStats(BaseModel):
    corpId: str
    corpName: str
    total: int
    ongoing: int
    expired: int


class DashboardStats(BaseModel):
    totalEquipment: int
    ongoingCount: int
    upcomingExpirations: int
    companyStats: Optional[List[CompanyStats]] = None
