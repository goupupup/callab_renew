from fastapi import FastAPI

from app.api import auth, dashboard, equipment, health, search
from app.core.config import Settings
from app.core.database import OracleDatabase
from app.repositories.auth_repo import AuthRepository
from app.repositories.dashboard_repo import DashboardRepository
from app.repositories.equipment_repo import EquipmentRepository
from app.repositories.search_repo import SearchRepository
from app.services.auth_service import AuthService
from app.services.dashboard_service import DashboardService
from app.services.equipment_service import EquipmentService
from app.services.search_service import SearchService


def create_app(
    settings: Settings = None,
    auth_service=None,
    dashboard_service=None,
    equipment_service=None,
    search_service=None,
) -> FastAPI:
    settings = settings or Settings()
    database = OracleDatabase(settings)
    auth_service = auth_service or AuthService(AuthRepository(database))
    dashboard_service = dashboard_service or DashboardService(DashboardRepository(database))
    equipment_service = equipment_service or EquipmentService(EquipmentRepository(database))
    search_service = search_service or SearchService(SearchRepository(database))

    app = FastAPI(title="CALLAB Backend", version="0.1.0")
    app.state.settings = settings
    app.state.auth_service = auth_service
    app.state.dashboard_service = dashboard_service
    app.state.equipment_service = equipment_service
    app.state.search_service = search_service
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(dashboard.router)
    app.include_router(equipment.router)
    app.include_router(search.router)
    return app


app = create_app()
