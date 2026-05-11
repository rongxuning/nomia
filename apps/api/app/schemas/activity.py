from datetime import datetime

from pydantic import BaseModel


class ActivityOut(BaseModel):
    id: str
    actor_user_id: str
    entity_type: str
    entity_id: str
    action: str
    metadata: dict
    created_at: datetime

