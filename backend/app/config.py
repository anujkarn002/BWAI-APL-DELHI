from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_ttl_seconds: int = 60 * 60 * 24  # 1 day

    demo_master_otp: str = "999999"

    gcp_project: str = "prototype-anuj"
    firestore_database: str = "(default)"

    gemini_location: str = "us-central1"
    gemini_model: str = "gemini-2.5-flash"
    governance_enabled: bool = True

    admin_key: str = "stadiumbite-admin-2026"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:8080",
    ]

    @model_validator(mode="after")
    def _check_jwt_secret(self) -> "Settings":
        if not self.jwt_secret or self.jwt_secret == "dev-secret-change-me":
            import os

            if os.getenv("ENV", "dev") != "dev":
                raise ValueError(
                    "JWT_SECRET must be set in production. "
                    "Generate one with: openssl rand -hex 32"
                )
            # Auto-generate a random secret for local dev convenience
            import secrets

            self.jwt_secret = secrets.token_hex(32)
        return self


settings = Settings()
