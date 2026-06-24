from app.services.auth_service import AuthService


class FakeAuthRepository:
    def find_active_user_by_id(self, user_id: str):
        if user_id.lower() == "admin":
            return {
                "USERID": "admin ",
                "PASSWORD": "caladmin07 ",
                "USERNAME": "Administrator ",
                "CORPID": "HCT ",
                "CORPNAME": "HCT ",
                "AUTHORITY": "A ",
                "CORPTYPE": "H ",
                "STATE": "1",
            }
        return None


def test_auth_service_maps_legacy_user_to_current_user():
    service = AuthService(FakeAuthRepository())

    user = service.authenticate(" admin ", " caladmin07 ")

    assert user is not None
    assert user.user_id == "admin"
    assert user.name == "Administrator"
    assert user.corp_id == "HCT"
    assert user.corp_name == "HCT"
    assert user.role == "MASTER"


def test_auth_service_rejects_wrong_password():
    service = AuthService(FakeAuthRepository())

    assert service.authenticate("admin", "wrong-password") is None
