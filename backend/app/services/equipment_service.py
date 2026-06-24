import math

from app.repositories.equipment_repo import EquipmentFilters, EquipmentSort
from app.schemas.auth import CurrentUser
from app.schemas.equipment import (
    EquipmentItem,
    EquipmentListResponse,
    EquipmentPagination,
    EquipmentQuery,
)


class EquipmentService:
    def __init__(self, equipment_repository):
        self.equipment_repository = equipment_repository

    def search(self, user: CurrentUser, query: EquipmentQuery) -> EquipmentListResponse:
        limit = query.limit
        page = query.page
        result = self.equipment_repository.search_equipment(
            corp_id=user.corp_id,
            is_elevated=user.role in ("MASTER", "EMPLOYEE"),
            filters=EquipmentFilters(
                serial_number=query.serialNumber,
                asset_no=query.assetNo,
                reg_no=query.regNo,
                model_name=query.modelName,
                equipment_name=query.equipmentName,
                company=query.company,
                manufacturer=query.manufacturer,
                last_cal_start=query.lastCalStart,
                last_cal_end=query.lastCalEnd,
                next_cal_start=query.nextCalStart,
                next_cal_end=query.nextCalEnd,
                on_going_only=query.onGoingOnly,
                expiration_only=query.expirationOnly,
            ),
            page=page,
            limit=limit,
            sort=EquipmentSort(sort_by=query.sortBy, order=query.order),
        )
        total = result["total"]
        is_all = limit >= 9999

        return EquipmentListResponse(
            data=[_map_item(row) for row in result["rows"]],
            pagination=EquipmentPagination(
                total=total,
                page=1 if is_all else page,
                limit=limit,
                totalPages=1 if is_all else math.ceil(total / limit) if total else 0,
            ),
        )


def _map_item(row) -> EquipmentItem:
    return EquipmentItem(
        ISID=_clean(row.get("ISID")),
        ACCN=_clean(row.get("ACCN")),
        SERN=_clean(row.get("SERN")),
        MODL=_clean(row.get("MODL")),
        NAEM_SUP=_clean(row.get("NAEM_SUP")),
        MNFC=_clean(row.get("MNFC")),
        REGD=_clean(row.get("REGD")),
        LAST=_clean(row.get("LAST")),
        NEXT=_clean(row.get("NEXT")),
        STAT=_clean(row.get("STAT")),
        MANUFACTURER_NAME=_clean(row.get("MANUFACTURER_NAME")),
        CUSTOMER_NAME=_clean(row.get("CUSTOMER_NAME")),
    )


def _clean(value) -> str:
    return str(value).strip() if value is not None else ""
