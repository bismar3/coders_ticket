import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class StaffIn(RegisterIn):
    role: str = Field(pattern="^(organizador|portero)$")
    phone: str | None = Field(default=None, max_length=30)
    document_id: str | None = Field(default=None, max_length=30)
    position: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def organizer_needs_identity(self):
        # Un organizador administra la plataforma: se exige teléfono y documento.
        if self.role == "organizador" and not (self.phone and self.document_id):
            raise ValueError("Para un organizador se requiere teléfono y documento de identidad")
        return self


class StaffUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    document_id: str | None = Field(default=None, max_length=30)
    position: str | None = Field(default=None, max_length=80)
    is_active: bool | None = None
    new_password: str | None = Field(default=None, min_length=6, max_length=72)


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    document_id: str | None = Field(default=None, max_length=30)


class PasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str
    phone: str | None
    document_id: str | None
    position: str | None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class StaffPage(BaseModel):
    items: list[UserOut]
    total: int
    counts: dict[str, int]
