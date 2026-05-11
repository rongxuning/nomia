from app.schemas.item import ItemOut


class MyItemOut(ItemOut):
    workspace_id: str
    workspace_name: str
    project_id: str
    project_name: str
