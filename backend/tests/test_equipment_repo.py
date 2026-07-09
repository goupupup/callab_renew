from app.repositories.equipment_repo import EquipmentFilters, EquipmentRepository, EquipmentSort


class FakeDatabase:
    def __init__(self, all_results=None):
        self.one_calls = []
        self.all_calls = []
        self.all_results = list(all_results or [])

    def fetch_one(self, sql: str, params: dict):
        self.one_calls.append((sql, params))
        return {"TOTAL": 42}

    def fetch_all(self, sql: str, params: dict):
        self.all_calls.append((sql, params))
        if self.all_results:
            return self.all_results.pop(0)
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
    assert "COUNT(DISTINCT TRIM(m.ISID)) as TOTAL" in count_sql
    assert "FROM EASYCAL.TBMASMAN m" in count_sql
    assert "TRIM(m.CUST) = :corp_id" in count_sql
    assert "TRIM(m.CUST) = :corp_id" in data_sql
    assert "MAX(TRIM(CONM)) as CONM" in data_sql
    assert ") cust ON TRIM(m.CUST) = cust.COID" in data_sql
    assert ") mnfc ON TRIM(m.MNFC) = mnfc.COID" in data_sql
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

    lookup_sql, lookup_params = database.all_calls[0]
    data_sql, data_params = database.all_calls[1]
    assert "FROM EASYCAL.TBSUPMAN" in lookup_sql
    assert lookup_params["company"] == "Acme"
    assert "UPPER(TRIM(m.CUST)) LIKE '%' || UPPER(TRIM(:company_id_text)) || '%'" in data_sql
    assert data_params["company_id_text"] == "Acme"
    assert "corp_id" not in data_params


def test_equipment_repository_uses_resolved_company_ids_for_elevated_company_filter():
    database = FakeDatabase(all_results=[[{"COID": "C001"}, {"COID": "C002"}]])
    repo = EquipmentRepository(database)

    repo.search_equipment(
        corp_id="HCT",
        is_elevated=True,
        filters=EquipmentFilters(company="Acme"),
        page=1,
        limit=25,
        sort=EquipmentSort(sort_by="regDate", order="desc"),
    )

    data_sql, data_params = database.all_calls[1]
    assert "TRIM(m.CUST) IN (:company_id_0, :company_id_1)" in data_sql
    assert data_params["company_id_0"] == "C001"
    assert data_params["company_id_1"] == "C002"
    assert "EXISTS" not in data_sql


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


def test_equipment_repository_sorts_by_actual_customer_name_value():
    database = FakeDatabase()
    repo = EquipmentRepository(database)

    repo.search_equipment(
        corp_id="HCT",
        is_elevated=True,
        filters=EquipmentFilters(),
        page=1,
        limit=25,
        sort=EquipmentSort(sort_by="customerName", order="asc"),
    )

    data_sql, _ = database.all_calls[0]
    assert "cust.CONM" in data_sql
    assert ") cust ON TRIM(m.CUST) = cust.COID" in data_sql
    assert "ORDER BY" in data_sql
    assert "ASC" in data_sql


def test_equipment_repository_history_sorts_by_actual_hct_number_value():
    database = FakeDatabase()
    repo = EquipmentRepository(database)

    repo.search_history(
        corp_id="HCT",
        is_elevated=True,
        search_type="regNo",
        keyword="123",
        page=1,
        limit=25,
        sort_by="hctNo",
        order="asc",
    )

    data_sql, _ = database.all_calls[0]
    assert "TO_NUMBER(REGEXP_REPLACE(TRIM(c.ISID), '[^0-9]', '')) ASC" in data_sql
    assert "c.CIDU DESC" in data_sql


def test_equipment_repository_history_sorts_dates_as_oracle_dates():
    database = FakeDatabase()
    repo = EquipmentRepository(database)

    repo.search_history(
        corp_id="HCT",
        is_elevated=True,
        search_type="regNo",
        keyword="123",
        page=1,
        limit=25,
        sort_by="calDate",
        order="asc",
    )

    data_sql, _ = database.all_calls[0]
    assert "TO_DATE(TRIM(c.CARD), 'YYYYMMDD') END ASC NULLS LAST" in data_sql


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
    assert "SELECT MAX(cal_latest.CIDU)" in count_sql
    assert "SELECT MAX(cal_latest.CIDU)" in data_sql
    assert "cal_ret.ROTD >= :return_date_start" in data_sql
    assert "cal_ret.ROTD <= :return_date_end" in data_sql
    assert count_params["return_date_start"] == "20240101"
    assert count_params["return_date_end"] == "20240131"
    assert data_params["return_date_start"] == "20240101"
    assert data_params["return_date_end"] == "20240131"
