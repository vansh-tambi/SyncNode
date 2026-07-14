from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api", tags=["collections-environments"])

# --- Collections ---
@router.get("/collections", response_model=List[schemas.Collection])
def get_collections(db: Session = Depends(get_db)):
    return db.query(models.Collection).all()

@router.post("/collections", response_model=schemas.Collection)
def create_collection(collection: schemas.CollectionCreate, db: Session = Depends(get_db)):
    db_col = models.Collection(name=collection.name, description=collection.description)
    db.add(db_col)
    db.commit()
    db.refresh(db_col)
    return db_col

@router.post("/requests", response_model=schemas.SavedRequest)
def create_request(req: schemas.SavedRequestCreate, db: Session = Depends(get_db)):
    # Verify collection exists
    col = db.query(models.Collection).filter(models.Collection.id == req.collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    db_req = models.SavedRequest(
        collection_id=req.collection_id,
        name=req.name,
        method=req.method,
        url=req.url,
        headers=req.headers,
        query_params=req.query_params,
        body_type=req.body_type,
        body=req.body,
        auth_type=req.auth_type,
        auth_data=req.auth_data,
        order=req.order
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req

@router.patch("/collections/{id}", response_model=schemas.Collection)
def update_collection(id: int, col_update: schemas.CollectionUpdate, db: Session = Depends(get_db)):
    db_col = db.query(models.Collection).filter(models.Collection.id == id).first()
    if not db_col:
        raise HTTPException(status_code=404, detail="Collection not found")
    if col_update.name is not None:
        db_col.name = col_update.name
    if col_update.description is not None:
        db_col.description = col_update.description
    db.commit()
    db.refresh(db_col)
    return db_col

@router.delete("/collections/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(id: int, db: Session = Depends(get_db)):
    db_col = db.query(models.Collection).filter(models.Collection.id == id).first()
    if not db_col:
        raise HTTPException(status_code=404, detail="Collection not found")
    db.delete(db_col)
    db.commit()
    return None

@router.patch("/requests/{id}", response_model=schemas.SavedRequest)
def update_request(id: int, req_update: schemas.SavedRequestUpdate, db: Session = Depends(get_db)):
    db_req = db.query(models.SavedRequest).filter(models.SavedRequest.id == id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Saved request not found")
    
    update_data = req_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_req, key, value)
        
    db.commit()
    db.refresh(db_req)
    return db_req

@router.delete("/requests/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(id: int, db: Session = Depends(get_db)):
    db_req = db.query(models.SavedRequest).filter(models.SavedRequest.id == id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Saved request not found")
    db.delete(db_req)
    db.commit()
    return None

# --- Environments ---
@router.get("/environments", response_model=List[schemas.Environment])
def get_environments(db: Session = Depends(get_db)):
    return db.query(models.Environment).all()

@router.post("/environments", response_model=schemas.Environment)
def create_environment(env: schemas.EnvironmentCreate, db: Session = Depends(get_db)):
    db_env = models.Environment(name=env.name, is_active=env.is_active)
    db.add(db_env)
    db.commit()
    db.refresh(db_env)
    return db_env

@router.post("/environments/{env_id}/variables", response_model=schemas.EnvironmentVariable)
def add_variable(env_id: int, var: schemas.EnvironmentVariableCreate, db: Session = Depends(get_db)):
    db_var = models.EnvironmentVariable(
        environment_id=env_id,
        key=var.key,
        value=var.value,
        enabled=var.enabled
    )
    db.add(db_var)
    db.commit()
    db.refresh(db_var)
    return db_var

@router.put("/environments/variables/{var_id}", response_model=schemas.EnvironmentVariable)
def update_variable(var_id: int, var: schemas.EnvironmentVariableCreate, db: Session = Depends(get_db)):
    db_var = db.query(models.EnvironmentVariable).filter(models.EnvironmentVariable.id == var_id).first()
    if not db_var:
        raise HTTPException(status_code=404, detail="Variable not found")
    db_var.key = var.key
    db_var.value = var.value
    db_var.enabled = var.enabled
    db.commit()
    db.refresh(db_var)
    return db_var

@router.delete("/environments/variables/{var_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variable(var_id: int, db: Session = Depends(get_db)):
    db_var = db.query(models.EnvironmentVariable).filter(models.EnvironmentVariable.id == var_id).first()
    if not db_var:
        raise HTTPException(status_code=404, detail="Variable not found")
    db.delete(db_var)
    db.commit()
    return None
