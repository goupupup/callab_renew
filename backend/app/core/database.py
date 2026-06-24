from typing import Any, Dict, List, Optional

import oracledb

from app.core.config import Settings


class OracleDatabase:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._pool = None

    def fetch_one(self, sql: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        rows = self.fetch_all(sql, params)
        return rows[0] if rows else None

    def fetch_all(self, sql: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        with self._get_pool().acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                columns = [column[0] for column in cursor.description or []]
                return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def execute(self, sql: str, params: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_pool().acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                connection.commit()
                return {"rowsAffected": cursor.rowcount}

    def _get_pool(self):
        if self._pool is None:
            if self.settings.oracle_thick_mode:
                self._init_oracle_client()
            self._pool = oracledb.create_pool(
                user=self.settings.oracle_user,
                password=self.settings.oracle_password,
                dsn=self.settings.oracle_dsn,
                min=1,
                max=4,
                increment=1,
            )
        return self._pool

    def _init_oracle_client(self) -> None:
        try:
            if self.settings.oracle_lib_dir:
                oracledb.init_oracle_client(lib_dir=self.settings.oracle_lib_dir)
            else:
                oracledb.init_oracle_client()
        except Exception as exc:
            if "already been initialized" not in str(exc):
                raise
