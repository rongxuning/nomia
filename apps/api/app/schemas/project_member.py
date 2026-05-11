from pydantic import BaseModel


class ProjectMemberAdd(BaseModel):
    user_id: str
    role: str = "member"


class ProjectMemberOut(BaseModel):
    id: str
    user_id: str
    email: str
    display_name: str
    role: str
    status: str

