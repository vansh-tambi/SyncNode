from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import HistoryEntry
from ..schemas import HistoryEntry as HistoryEntrySchema

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("", response_model=List[HistoryEntrySchema])
def get_history(db: Session = Depends(get_db)):
    return db.query(HistoryEntry).order_by(HistoryEntry.created_at.desc()).all()

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(db: Session = Depends(get_db)):
    db.query(HistoryEntry).delete()
    db.commit()
    return None

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(HistoryEntry).filter(HistoryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="History entry not found"
        )
    db.delete(entry)
    db.commit()
    return None
