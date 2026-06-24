from pydantic import BaseModel


class CurrentUser(BaseModel):
    user_id: str
    name: str
    corp_id: str
    corp_name: str
    role: str
