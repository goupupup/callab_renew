from datetime import datetime
from typing import Callable, Optional

from app.schemas.auth import CurrentUser
from app.schemas.dashboard import CompanyStats, DashboardStats


class DashboardService:
    def __init__(self, dashboard_repository, today_provider: Optional[Callable[[], str]] = None):
        self.dashboard_repository = dashboard_repository
        self.today_provider = today_provider or _today_yyyymmdd

    def get_stats(self, user: CurrentUser) -> DashboardStats:
        today = self.today_provider()
        basic = self.dashboard_repository.get_basic_stats(user.corp_id, today)
        company_stats = None

        if user.role == "MASTER":
            company_stats = [
                CompanyStats(
                    corpId=_clean(row.get("CORP_ID")),
                    corpName=_clean(row.get("CORP_NAME")),
                    total=_to_int(row.get("TOTAL")),
                    ongoing=_to_int(row.get("ONGOING")),
                    expired=_to_int(row.get("EXPIRED")),
                )
                for row in self.dashboard_repository.list_company_stats(today)
            ]

        return DashboardStats(
            totalEquipment=_to_int(basic.get("TOTAL_EQUIPMENT")),
            ongoingCount=_to_int(basic.get("ONGOING_COUNT")),
            upcomingExpirations=_to_int(basic.get("EXPIRED_COUNT")),
            companyStats=company_stats,
        )

    def list_expirations(self, user: CurrentUser):
        return [
            {key: _clean(value) for key, value in row.items()}
            for row in self.dashboard_repository.list_expirations(
                corp_id=user.corp_id,
                is_master=user.role == "MASTER",
            )
        ]


def _today_yyyymmdd() -> str:
    return datetime.utcnow().strftime("%Y%m%d")


def _clean(value) -> str:
    return str(value).strip() if value is not None else ""


def _to_int(value) -> int:
    return int(value or 0)
