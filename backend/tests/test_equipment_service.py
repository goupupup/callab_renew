from app.schemas.auth import CurrentUser
from app.schemas.equipment import EquipmentQuery
from app.services.equipment_service import EquipmentService


class FakeEquipmentRepository:
    def __init__(self):
        self.call = None

    def search_equipment(self, corp_id, is_elevated, filters, page, limit, sort):
        self.call = {
            "corp_id": corp_id,
            "is_elevated": is_elevated,
            "filters": filters,
            "page": page,
            "limit": limit,
            "sort": sort,
        }
        return {
            "total": 1,
            "rows": [
                {
                    "ISID": " 1001 ",
                    "ACCN": " A-1 ",
                    "SERN": " SN ",
                    "MODL": " MODEL ",
                    "NAEM_SUP": " EQUIP ",
                    "MNFC": " M001 ",
                    "REGD": "20260101",
                    "LAST": "20250101",
                    "NEXT": "20270101",
                    "STAT": "10",
                    "MANUFACTURER_NAME": "Maker",
                    "CUSTOMER_NAME": "Customer",
                }
            ],
        }


def test_equipment_service_maps_rows_and_pagination_for_customer_user():
    repo = FakeEquipmentRepository()
    service = EquipmentService(repo)
    user = CurrentUser(
        user_id="customer",
        name="Customer",
        corp_id="C001",
        corp_name="Customer Corp",
        role="USER",
    )

    result = service.search(user, EquipmentQuery(page=1, limit=25))

    assert repo.call["corp_id"] == "C001"
    assert repo.call["is_elevated"] is False
    assert result.pagination.total == 1
    assert result.pagination.totalPages == 1
    assert result.data[0].ISID == "1001"
    assert result.data[0].ACCN == "A-1"


def test_equipment_service_marks_master_as_elevated():
    repo = FakeEquipmentRepository()
    service = EquipmentService(repo)
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )

    service.search(user, EquipmentQuery(company="Acme"))

    assert repo.call["is_elevated"] is True
    assert repo.call["filters"].company == "Acme"
