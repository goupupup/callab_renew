class ScheduleRepository:
    def __init__(self, database):
        self.database = database

    def list_schedules(self):
        return self.database.fetch_all(
            """
            SELECT
                TO_CHAR(STARTDATE, 'YYYY-MM-DD') as STARTDATE,
                TO_CHAR(ENDDATE, 'YYYY-MM-DD') as ENDDATE,
                SCH_TYPE,
                DIVISION,
                MEMO,
                TRIM(EMID1) as EMID1,
                TRIM(EMID2) as EMID2,
                TRIM(EMID3) as EMID3,
                TRIM(EMID4) as EMID4,
                TRIM(EMID5) as EMID5,
                TRIM(SCHID) as SCHID
            FROM EASYCAL.TBSCHMAN
            WHERE STARTDATE >= ADD_MONTHS(SYSDATE, -6)
            ORDER BY STARTDATE DESC
            """,
            {},
        )

    def list_employees(self):
        return self.database.fetch_all(
            """
            SELECT
                TRIM(EMID) as ID,
                '[' || TRIM(EMID) || '] ' || TRIM(EMNM) as NAME
            FROM EASYCAL.TBEMPMAN
            ORDER BY NAME ASC
            """,
            {},
        )

    def create_schedule(self, payload):
        return self.database.execute(
            """
            INSERT INTO EASYCAL.TBSCHMAN (
                STARTDATE, ENDDATE, SCH_TYPE, DIVISION, MEMO,
                EMID1, EMID2, EMID3, EMID4, EMID5, SCHID
            ) VALUES (
                TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'),
                :schType, :division, :memo,
                :emid1, :emid2, :emid3, :emid4, :emid5, :schId
            )
            """,
            _schedule_params(payload, include_id=True),
        )

    def update_schedule(self, schedule_id: str, payload):
        params = _schedule_params(payload, include_id=False)
        params["schedule_id"] = schedule_id
        return self.database.execute(
            """
            UPDATE EASYCAL.TBSCHMAN SET
                STARTDATE = TO_DATE(:startDate, 'YYYY-MM-DD'),
                ENDDATE = TO_DATE(:endDate, 'YYYY-MM-DD'),
                SCH_TYPE = :schType,
                DIVISION = :division,
                MEMO = :memo,
                EMID1 = :emid1,
                EMID2 = :emid2,
                EMID3 = :emid3,
                EMID4 = :emid4,
                EMID5 = :emid5
            WHERE TRIM(SCHID) = :schedule_id
            """,
            params,
        )

    def delete_schedule(self, schedule_id: str):
        return self.database.execute(
            "DELETE FROM EASYCAL.TBSCHMAN WHERE TRIM(SCHID) = :schedule_id",
            {"schedule_id": schedule_id},
        )


def _schedule_params(payload, include_id: bool):
    params = {
        "startDate": payload.get("startDate", ""),
        "endDate": payload.get("endDate", ""),
        "schType": payload.get("schType", ""),
        "division": payload.get("division", ""),
        "memo": payload.get("memo", ""),
        "emid1": _extract_code(payload.get("emid1", "")),
        "emid2": _extract_code(payload.get("emid2", "")),
        "emid3": _extract_code(payload.get("emid3", "")),
        "emid4": _extract_code(payload.get("emid4", "")),
        "emid5": _extract_code(payload.get("emid5", "")),
    }
    if include_id:
        params["schId"] = str(payload.get("schId", "")).strip()
    return params


def _extract_code(value):
    text = str(value or "").strip()
    if text.startswith("[") and "]" in text:
        return text[1 : text.index("]")].strip()
    return text
