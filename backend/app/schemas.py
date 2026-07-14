from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

# Helper base schema
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True

# --- Health Check Schema ---
class HealthStatus(BaseSchema):
    status: str
    database: str

# --- Environment Variable Schemas ---
class EnvironmentVariableBase(BaseSchema):
    key: str
    value: str
    enabled: bool = True

class EnvironmentVariableCreate(EnvironmentVariableBase):
    pass

class EnvironmentVariable(EnvironmentVariableBase):
    id: int
    environment_id: int

# --- Environment Schemas ---
class EnvironmentBase(BaseSchema):
    name: str
    is_active: bool = False

class EnvironmentCreate(EnvironmentBase):
    pass

class Environment(EnvironmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    variables: List[EnvironmentVariable] = []

# --- Saved Request Schemas ---
class SavedRequestBase(BaseSchema):
    name: str
    method: str
    url: str
    headers: Optional[Dict[str, Any]] = Field(default_factory=dict)
    query_params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    body_type: Optional[str] = None
    body: Optional[str] = None
    auth_type: Optional[str] = None
    auth_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    order: int = 0

class SavedRequestCreate(SavedRequestBase):
    collection_id: int

class SavedRequestUpdate(BaseSchema):
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, Any]] = None
    query_params: Optional[Dict[str, Any]] = None
    body_type: Optional[str] = None
    body: Optional[str] = None
    auth_type: Optional[str] = None
    auth_data: Optional[Dict[str, Any]] = None
    order: Optional[int] = None

class SavedRequest(SavedRequestBase):
    id: int
    collection_id: int
    created_at: datetime
    updated_at: datetime

# --- Collection Schemas ---
class CollectionBase(BaseSchema):
    name: str
    description: Optional[str] = None

class CollectionCreate(CollectionBase):
    pass

class CollectionUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None

class Collection(CollectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    requests: List[SavedRequest] = []

# --- History Entry Schemas ---
class HistoryEntryBase(BaseSchema):
    method: str
    url: str
    headers: Optional[Dict[str, Any]] = Field(default_factory=dict)
    query_params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    body: Optional[str] = None
    auth_type: Optional[str] = None
    auth_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    response_status: Optional[int] = None
    response_time_ms: Optional[int] = None
    response_size_bytes: Optional[int] = None
    response_headers: Optional[Dict[str, Any]] = Field(default_factory=dict)
    response_body: Optional[str] = None

class HistoryEntryCreate(HistoryEntryBase):
    pass

class HistoryEntry(HistoryEntryBase):
    id: int
    created_at: datetime

# --- Execution Schemas ---
class ResolvedRequestInfo(BaseSchema):
    method: str
    url: str
    headers: Dict[str, str] = Field(default_factory=dict)
    body: Optional[str] = None

class ExecuteRequest(BaseSchema):
    method: str
    url: str
    headers: Optional[Dict[str, str]] = Field(default_factory=dict)
    query_params: Optional[Dict[str, str]] = Field(default_factory=dict)
    body_type: Optional[str] = None
    body: Optional[str] = None
    auth_type: Optional[str] = None
    auth_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    environment_id: Optional[int] = None

class ExecuteResponse(BaseSchema):
    status_code: int
    time_ms: int
    size_bytes: int
    headers: Dict[str, str] = Field(default_factory=dict)
    body: Optional[str] = None
    resolved_request: ResolvedRequestInfo
    error_message: Optional[str] = None
