from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import accounts, auth, dashboard, equipment, health, schedules, search
from app.core.config import Settings
from app.core.database import OracleDatabase
from app.repositories.auth_repo import AuthRepository
from app.repositories.account_repo import AccountRepository
from app.repositories.dashboard_repo import DashboardRepository
from app.repositories.equipment_repo import EquipmentRepository
from app.repositories.search_repo import SearchRepository
from app.repositories.schedule_repo import ScheduleRepository
from app.services.auth_service import AuthService
from app.services.account_service import AccountService
from app.services.dashboard_service import DashboardService
from app.services.equipment_service import EquipmentService
from app.services.equipment_file_service import EquipmentFileService
from app.services.search_service import SearchService
from app.services.schedule_service import ScheduleService


def create_app(
    settings: Settings = None,
    auth_service=None,
    account_service=None,
    dashboard_service=None,
    equipment_service=None,
    file_service=None,
    search_service=None,
    schedule_service=None,
) -> FastAPI:
    settings = settings or Settings()
    database = OracleDatabase(settings)
    auth_service = auth_service or AuthService(AuthRepository(database))
    account_service = account_service or AccountService(AccountRepository(database))
    dashboard_service = dashboard_service or DashboardService(DashboardRepository(database))
    equipment_repository = EquipmentRepository(database)
    equipment_service = equipment_service or EquipmentService(equipment_repository)
    file_service = file_service or EquipmentFileService(settings, equipment_repository)
    search_service = search_service or SearchService(SearchRepository(database))
    schedule_service = schedule_service or ScheduleService(ScheduleRepository(database))

    app = FastAPI(title="CALLAB Backend", version="0.1.0")
    cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    if cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    app.state.settings = settings
    app.state.auth_service = auth_service
    app.state.account_service = account_service
    app.state.dashboard_service = dashboard_service
    app.state.equipment_service = equipment_service
    app.state.file_service = file_service
    app.state.search_service = search_service
    app.state.schedule_service = schedule_service
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(accounts.router)
    app.include_router(accounts.my_account_router)
    app.include_router(dashboard.router)
    app.include_router(equipment.router)
    app.include_router(search.router)
    app.include_router(schedules.router)
    return app


app = create_app()
