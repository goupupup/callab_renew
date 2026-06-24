from app.schemas.auth import CurrentUser
from app.services.dashboard_service import DashboardService


class FakeDashboardRepository:
    def get_basic_stats(self, corp_id: str, today: str):
        return {"TOTAL_EQUIPMENT": 10, "ONGOING_COUNT": 2, "EXPIRED_COUNT": 1}

    def list_company_stats(self, today: str):
        return [
            {
                "CORP_ID": "C001",
                "CORP_NAME": "Customer Corp",
                "TOTAL": 10,
                "ONGOING": 2,
                "EXPIRED": 1,
            }
        ]


def test_dashboard_service_hides_company_stats_for_customer_user():
    service = DashboardService(FakeDashboardRepository(), today_provider=lambda: "20260623")
    user = CurrentUser(
        user_id="customer",
        name="Customer",
        corp_id="C001",
        corp_name="Customer Corp",
        role="USER",
    )

    stats = service.get_stats(user)

    assert stats.companyStats is None
    assert stats.totalEquipment == 10


def test_dashboard_service_includes_company_stats_for_master():
    service = DashboardService(FakeDashboardRepository(), today_provider=lambda: "20260623")
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )

    stats = service.get_stats(user)

    assert stats.companyStats is not None
    assert stats.companyStats[0].corpId == "C001"
