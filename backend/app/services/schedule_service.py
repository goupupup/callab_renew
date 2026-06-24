class ScheduleService:
    def __init__(self, schedule_repository):
        self.schedule_repository = schedule_repository

    def list_schedules(self):
        return [_clean_row(row) for row in self.schedule_repository.list_schedules()]

    def list_employees(self):
        return [_clean_row(row) for row in self.schedule_repository.list_employees()]

    def create_schedule(self, payload):
        self.schedule_repository.create_schedule(payload)
        return {"success": True, "id": str(payload.get("schId", ""))}

    def update_schedule(self, schedule_id, payload):
        self.schedule_repository.update_schedule(schedule_id, payload)
        return {"success": True}

    def delete_schedule(self, schedule_id):
        self.schedule_repository.delete_schedule(schedule_id)
        return {"success": True}


def _clean_row(row):
    return {key: str(value).strip() if value is not None else "" for key, value in row.items()}
