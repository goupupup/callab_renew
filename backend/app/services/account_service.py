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


def _clean_row(row):
    return {key: str(value).strip() if value is not None else "" for key, value in row.items()}
