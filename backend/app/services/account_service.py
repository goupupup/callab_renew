class AccountService:
    def __init__(self, account_repository):
        self.account_repository = account_repository

    def list_accounts(self):
        return [_clean_row(row) for row in self.account_repository.list_accounts()]

    def list_access_requests(self):
        return [_clean_row(row) for row in self.account_repository.list_access_requests()]

    def search_customer_companies(self, q: str):
        if len((q or "").strip()) < 2:
            return []
        return [_clean_row(row) for row in self.account_repository.search_customer_companies(q)]

    def create_account(self, payload):
        required = ("userId", "password", "userName")
        missing = [field for field in required if not payload.get(field)]
        if missing:
            return {"success": False, "error": "Missing required fields"}
        return {"success": True, **self.account_repository.create_account(payload)}

    def create_access_request(self, payload):
        required = ("email", "password", "userName", "contactEmail", "companyName", "companyLocation")
        missing = [field for field in required if not (getattr(payload, field, "") or "").strip()]
        if missing:
            return {"success": False, "error": "Missing required fields"}

        user_id = payload.email.strip()
        if self.account_repository.get_account_by_user_id(user_id) or self.account_repository.get_account_request(user_id):
            return {"success": False, "error": "An account or request already exists for this email"}

        row = {
            "userId": _fit(user_id, 50),
            "password": _fit(payload.password.strip(), 50),
            "userName": _fit(payload.userName.strip(), 18),
            "corpName": _fit(payload.companyName.strip(), 60),
            "corpAddress": _fit(payload.companyLocation.strip(), 200),
            "telNo": _fit(payload.phone.strip(), 18) if payload.phone else None,
            "email": _fit(payload.contactEmail.strip(), 50),
        }
        return {"success": True, **self.account_repository.create_access_request(row)}

    def approve_access_request(self, payload):
        required = ("userId", "corpId", "corpName")
        missing = [field for field in required if not (getattr(payload, field, "") or "").strip()]
        if missing:
            return {"success": False, "error": "Missing required fields"}
        if not self.account_repository.get_account_request(payload.userId):
            return {"success": False, "error": "Access request not found"}

        result = self.account_repository.approve_access_request(
            {
                "userId": _fit(payload.userId.strip(), 50),
                "corpId": _fit(payload.corpId.strip().upper(), 5),
                "corpName": _fit(payload.corpName.strip(), 60),
                "authority": _fit((payload.authority or "U").strip().upper(), 1),
                "corpType": _fit((payload.corpType or "C").strip().upper(), 1),
            }
        )
        return {"success": bool(result.get("rowsAffected", 0)), **result}

    def reject_access_request(self, payload):
        user_id = (payload.userId or "").strip()
        if not user_id:
            return {"success": False, "error": "Missing required fields"}
        if not self.account_repository.get_account_request(user_id):
            return {"success": False, "error": "Access request not found"}
        result = self.account_repository.reject_access_request(user_id)
        return {"success": bool(result.get("rowsAffected", 0)), **result}

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


def _fit(value: str, length: int) -> str:
    return (value or "").strip()[:length]
