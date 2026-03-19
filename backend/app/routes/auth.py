from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from ..database import get_db
from ..models import User
from ..services.auth_service import (
    hash_password, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter no mínimo 6 caracteres")

    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

    token = create_access_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}


class UpdateProfileRequest(BaseModel):
    name: str = None
    current_password: str = None
    new_password: str = None


@router.patch("/me")
def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()

    if req.name is not None:
        if not req.name.strip():
            raise HTTPException(status_code=400, detail="Nome não pode ser vazio")
        user.name = req.name.strip()

    if req.new_password is not None:
        if not req.current_password:
            raise HTTPException(status_code=400, detail="Informe a senha atual")
        if not verify_password(req.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
        if len(req.new_password) < 6:
            raise HTTPException(status_code=400, detail="Nova senha deve ter no mínimo 6 caracteres")
        user.hashed_password = hash_password(req.new_password)

    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email}
