import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str # "PATIENT" or "DOCTOR"

class UserRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
