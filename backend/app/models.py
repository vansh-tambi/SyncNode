from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    requests = relationship("SavedRequest", back_populates="collection", cascade="all, delete-orphan")


class SavedRequest(Base):
    __tablename__ = "saved_requests"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    method = Column(String, nullable=False)  # GET, POST, PUT, DELETE, etc.
    url = Column(String, nullable=False)
    headers = Column(JSON, nullable=True, default=dict)       # JSON object for key-value headers
    query_params = Column(JSON, nullable=True, default=dict)  # JSON object for key-value query params
    body_type = Column(String, nullable=True)                 # none, raw, form-data, json, etc.
    body = Column(String, nullable=True)                      # String representing body (could be JSON or raw text)
    auth_type = Column(String, nullable=True)                 # none, bearer, basic, apikey, etc.
    auth_data = Column(JSON, nullable=True, default=dict)     # JSON configuration for auth
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    collection = relationship("Collection", back_populates="requests")


class Environment(Base):
    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    variables = relationship("EnvironmentVariable", back_populates="environment", cascade="all, delete-orphan")


class EnvironmentVariable(Base):
    __tablename__ = "environment_variables"

    id = Column(Integer, primary_key=True, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id", ondelete="CASCADE"), nullable=False)
    key = Column(String, nullable=False, index=True)
    value = Column(String, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    environment = relationship("Environment", back_populates="variables")


class HistoryEntry(Base):
    __tablename__ = "history_entries"

    id = Column(Integer, primary_key=True, index=True)
    method = Column(String, nullable=False)
    url = Column(String, nullable=False)
    headers = Column(JSON, nullable=True, default=dict)
    query_params = Column(JSON, nullable=True, default=dict)
    body = Column(String, nullable=True)
    auth_type = Column(String, nullable=True)
    auth_data = Column(JSON, nullable=True, default=dict)
    
    # Response Details
    response_status = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    response_size_bytes = Column(Integer, nullable=True)
    response_headers = Column(JSON, nullable=True, default=dict)
    response_body = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
