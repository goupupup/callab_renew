from app.schemas.account import MyAccountUpdate
from app.schemas.auth import CurrentUser
from app.services.account_service import AccountService


class FakeAccountRepository:
    def __init__(self):
        self.updated_payload = None

    def get_account_by_user_id(self, user_id: str):
        return {
            "USERID": user_id,
            "USERNAME": "Existing User",
            "CORPID": "C001",
            "CORPNAME": "Customer Corp",
            "PASSWORD": "old-password",
            "TELNO": None,
            "EMAIL": None,
        }

    def update_my_account(self, user_id: str, payload):
        self.updated_payload = payload
        return {"rowsAffected": 1}


def _user():
    return CurrentUser(
        user_id="customer",
        name="Existing User",
        corp_id="C001",
        corp_name="Customer Corp",
        role="USER",
    )


def test_account_service_requires_current_password_for_password_change():
    repository = FakeAccountRepository()
    service = AccountService(repository)

    result = service.update_my_account(
        _user(),
        MyAccountUpdate(telNo="", email="", password="new-password"),
    )

    assert result == {"success": False, "error": "Current password is required"}
    assert repository.updated_payload is None


def test_account_service_rejects_wrong_current_password():
    repository = FakeAccountRepository()
    service = AccountService(repository)

    result = service.update_my_account(
        _user(),
        MyAccountUpdate(
            telNo="",
            email="",
            currentPassword="wrong-password",
            password="new-password",
        ),
    )

    assert result == {"success": False, "error": "Current password is incorrect"}
    assert repository.updated_payload is None


def test_account_service_allows_empty_contact_and_email():
    repository = FakeAccountRepository()
    service = AccountService(repository)

    result = service.update_my_account(_user(), MyAccountUpdate(telNo="", email=""))

    assert result["success"] is True
    assert repository.updated_payload["telNo"] == ""
    assert repository.updated_payload["email"] == ""
