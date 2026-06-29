from app.repositories.equipment_repo import EquipmentFilters, EquipmentRepository, EquipmentSort


class FakeDatabase:
    def __init__(self):
        self.one_calls = []
        self.all_calls = []

    def fetch_one(self, sql: str, params: dict):
        self.one_calls.append((sql, params))
        return {"TOTAL": 42}

    def fetch_all(self, sql: str, params: dict):
        self.all_calls.append((sql, params))
        return []


def test_equipment_repository_scopes_customer_user_by_corp_id():
    database = FakeDatabase()
    repo = EquipmentRepository(database)

    repo.search_equipment(
        corp_id="C001",
        is_elevated=False,
        filters=EquipmentFilters(),
        page=1,
        limit=25,
        sort=EquipmentSort(sort_by="regDate", order="desc"),
    )

    count_sql, count_params = database.one_calls[0]
    data_sql, data_params = database.all_calls[0]
    assert "TRIM(CUST) = :corp_id" in count_sql
    assert "TRIM(m.CUST) = :corp_id" in data_sql
    assert count_params["corp_id"] == "C001"
    assert data_params["corp_id"] == "C001"


def test_equipment_repository_applies_company_filter_only_for_elevated_users():
    database = FakeDatabase()
    repo = EquipmentRepository(database)

    repo.search_equipment(
        corp_id="HCT",
        is_elevated=True,
        filters=EquipmentFilters(company="Acme"),
        page=1,
        limit=25,
        sort=EquipmentSort(sort_by="regDate", order="desc"),
    )

    data_sql, data_params = database.all_calls[0]
    assert "TRIM(m.CUST) LIKE '%' || :company || '%'" in data_sql
    assert data_params["company"] == "Acme"
    assert "corp_id" not in data_params


def test_equipment_repository_uses_rownum_pagination_for_oracle_11g():
    database = FakeDatabase()
    repo = EquipmentRepository(database)

    repo.search_equipment(
        corp_id="C001",
        is_elevated=False,
        filters=EquipmentFilters(serial_number="SN-1"),
        page=3,
        limit=25,
        sort=EquipmentSort(sort_by="hctNo", order="asc"),
    )

    data_sql, data_params = database.all_calls[0]
    assert "ROWNUM <= :upper_limit" in data_sql
    assert "rnum > :offset" in data_sql
    assert "TO_NUMBER(REGEXP_REPLACE(TRIM(m.ISID), '[^0-9]', '')) ASC" in data_sql
    assert data_params["sern"] == "SN-1"
    assert data_params["offset"] == 50
    assert data_params["upper_limit"] == 75


def test_equipment_repository_filters_by_return_date_range():
    database = FakeDatabase()
    repo = EquipmentRepository(database)

    repo.search_equipment(
        corp_id="HCT",
        is_elevated=True,
        filters=EquipmentFilters(return_date_start="2024-01-01", return_date_end="2024-01-31"),
        page=1,
        limit=25,
        sort=EquipmentSort(sort_by="regDate", order="desc"),
    )

    count_sql, count_params = database.one_calls[0]
    data_sql, data_params = database.all_calls[0]
    assert "EASYCAL.TBCALMAN cal_ret" in count_sql
    assert "EASYCAL.TBCALMAN cal_ret" in data_sql
    assert "cal_ret.ROTD >= :return_date_start" in data_sql
    assert "cal_ret.ROTD <= :return_date_end" in data_sql
    assert count_params["return_date_start"] == "20240101"
    assert count_params["return_date_end"] == "20240131"
    assert data_params["return_date_start"] == "20240101"
    assert data_params["return_date_end"] == "20240131"
