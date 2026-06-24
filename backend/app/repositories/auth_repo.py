from typing import Any, Dict, Optional


class AuthRepository:
    def __init__(self, database):
        self.database = database

    def find_active_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self.database.fetch_one(
            """
            SELECT
                USERID,
                PASSWORD,
                USERNAME,
                CORPID,
                CORPNAME,
                AUTHORITY,
                CORPTYPE,
                STATE
            FROM CUSTCAL.TWUSRMAN
            WHERE UPPER(USERID) = UPPER(:user_id)
              AND STATE = '1'
            """,
            {"user_id": user_id.strip()},
        )
