from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_ttl_seconds: int = 60 * 60 * 24 * 7

    demo_master_otp: str = "999999"

    gcp_project: str = "prototype-anuj"
    firestore_database: str = "(default)"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:8080",
    ]


settings = Settings()
