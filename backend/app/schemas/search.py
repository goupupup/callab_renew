from typing import List

from pydantic import BaseModel


class LookupItem(BaseModel):
    CODE: str
    NAME: str


class SearchLookups(BaseModel):
    types: List[LookupItem]
    modes: List[LookupItem]
    statuses: List[LookupItem]
    suppliers: List[LookupItem]
    employees: List[LookupItem]
    subcontractors: List[LookupItem]
