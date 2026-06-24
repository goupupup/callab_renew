from app.schemas.search import LookupItem, SearchLookups


class SearchService:
    def __init__(self, search_repository):
        self.search_repository = search_repository

    def get_lookups(self) -> SearchLookups:
        rows = self.search_repository.get_lookups()
        return SearchLookups(
            types=_map_items(rows["types"]),
            modes=_map_items(rows["modes"]),
            statuses=_map_items(rows["statuses"]),
            suppliers=_map_items(rows["suppliers"]),
            employees=_map_items(rows["employees"]),
            subcontractors=_map_items(rows["subcontractors"]),
        )

    def search_reg_no(self, user, q: str):
        return _clean_rows(self.search_repository.search_reg_no(q))

    def search_cal_no(self, user, q: str):
        return _clean_rows(self.search_repository.search_cal_no(q))

    def search_model(self, user, q: str):
        return _clean_rows(self.search_repository.search_model(q))

    def search_model_advanced(self, user, filters):
        return _clean_rows(
            self.search_repository.search_model_advanced(
                filters,
                user.corp_id,
                user.role in ("MASTER", "EMPLOYEE"),
            )
        )

    def search_cal_history(self, user, filters):
        return _clean_rows(self.search_repository.search_cal_history(filters))

    def search_ongoing(self, user, filters):
        return _clean_rows(self.search_repository.search_ongoing(filters))

    def search_expirations(self, user, filters):
        return _clean_rows(self.search_repository.search_expirations(filters))

    def search_master(self, filters):
        return _clean_rows(self.search_repository.search_master(filters))

    def get_cal_history(self, isid: str):
        return _clean_rows(self.search_repository.get_cal_history(_extract_code(isid)))


def _map_items(rows):
    return [
        LookupItem(
            CODE=_clean(row.get("CODE")),
            NAME=_clean(row.get("NAME")),
        )
        for row in rows
    ]


def _clean(value) -> str:
    return str(value).strip() if value is not None else ""


def _clean_rows(rows):
    return [{key: _clean(value) for key, value in row.items()} for row in rows]


def _extract_code(value: str) -> str:
    text = _clean(value)
    if text.startswith("[") and "]" in text:
        return text[1 : text.index("]")].strip()
    return text
