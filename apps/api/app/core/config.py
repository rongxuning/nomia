from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_issuer: str = "nomia"
    jwt_audience: str = "nomia-web"
    access_token_expires_minutes: int = 30
    refresh_token_expires_days: int = 14


settings = Settings()

