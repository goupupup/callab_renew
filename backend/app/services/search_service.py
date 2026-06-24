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
