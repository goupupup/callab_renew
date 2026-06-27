class AccountService:
    def __init__(self, account_repository):
        self.account_repository = account_repository

    def list_accounts(self):
        return [_clean_row(row) for row in self.account_repository.list_accounts()]

    def create_account(self, payload):
        required = ("userId", "password", "userName")
        missing = [field for field in required if not payload.get(field)]
        if missing:
            return {"success": False, "error": "Missing required fields"}
        return {"success": True, **self.account_repository.create_account(payload)}

    def get_my_account(self, user):
        row = self.account_repository.get_account_by_user_id(user.user_id)
        if not row:
            return None
        clean = _clean_row(row)
        return {
            "userId": clean.get("USERID", ""),
            "userName": clean.get("USERNAME", ""),
            "corpId": clean.get("CORPID", ""),
            "corpName": clean.get("CORPNAME", ""),
            "telNo": clean.get("TELNO", ""),
            "email": clean.get("EMAIL", ""),
        }

    def update_my_account(self, user, payload):
        row = self.account_repository.get_account_by_user_id(user.user_id)
        if not row:
            return {"success": False, "error": "Account not found"}

        new_password = (payload.password or "").strip()
        current_password = (payload.currentPassword or "").strip()
        if new_password:
            if not current_password:
                return {"success": False, "error": "Current password is required"}
            if _clean_row(row).get("PASSWORD", "") != current_password:
                return {"success": False, "error": "Current password is incorrect"}

        self.account_repository.update_my_account(
            user.user_id,
            {
                "telNo": payload.telNo.strip(),
                "email": payload.email.strip(),
                "password": new_password,
            },
        )
        return {"success": True, "account": self.get_my_account(user)}


def _clean_row(row):
    return {key: str(value).strip() if value is not None else "" for key, value in row.items()}
