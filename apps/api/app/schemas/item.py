from datetime import datetime

from pydantic import BaseModel


class ItemCreate(BaseModel):
    title: str
    body: str | None = None
    status: str = "todo"
    priority: str = "1"
    start_at: datetime | None = None
    end_at: datetime | None = None
    details: str | None = None


class ItemUpdate(BaseModel):
    version: int
    title: str | None = None
    body: str | None = None
    status: str | None = None
    priority: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    details: str | None = None


class ItemOut(BaseModel):
    id: str
    title: str
    body: str | None
    status: str
    priority: str | None
    start_at: datetime | None
    end_at: datetime | None
    details: str | None
    version: int

