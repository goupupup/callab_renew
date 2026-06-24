from app.services.search_service import SearchService


class FakeSearchRepository:
    def get_lookups(self):
        return {
            "types": [{"CODE": " 01 ", "NAME": " [01] Type "}],
            "modes": [],
            "statuses": [],
            "suppliers": [],
            "employees": [],
            "subcontractors": [],
        }


def test_search_service_trims_lookup_values():
    service = SearchService(FakeSearchRepository())

    lookups = service.get_lookups()

    assert lookups.types[0].CODE == "01"
    assert lookups.types[0].NAME == "[01] Type"
