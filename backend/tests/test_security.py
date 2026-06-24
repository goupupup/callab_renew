from app.core.security import map_legacy_role


def test_master_role_maps_from_hct_admin_account():
    assert map_legacy_role(authority="A", corp_type="H") == "MASTER"


def test_employee_role_maps_from_hct_user_account():
    assert map_legacy_role(authority="U", corp_type="H") == "EMPLOYEE"


def test_customer_role_is_default_for_non_hct_accounts():
    assert map_legacy_role(authority="A", corp_type="C") == "USER"
