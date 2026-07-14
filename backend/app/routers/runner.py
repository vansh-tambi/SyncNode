import time
import base64
import re
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

from ..database import get_db
from ..models import EnvironmentVariable, HistoryEntry
from ..schemas import ExecuteRequest, ExecuteResponse, ResolvedRequestInfo

router = APIRouter(prefix="/api/runner", tags=["runner"])

def resolve_placeholders(text: str, variables: Dict[str, str]) -> str:
    if not text:
        return text
    
    # Replace all occurrences of {{variable_name}} with its value
    def replace(match):
        var_name = match.group(1).strip()
        return variables.get(var_name, match.group(0))
        
    return re.sub(r"\{\{([^}]+)\}\}", replace, text)

def apply_auth(headers: Dict[str, str], auth_type: str, auth_data: Dict[str, Any]):
    if not auth_type or auth_type.lower() == "none" or not auth_data:
        return
        
    auth_type = auth_type.lower()
    if auth_type == "bearer":
        token = auth_data.get("token")
        if token:
            headers["Authorization"] = f"Bearer {token}"
    elif auth_type == "basic":
        username = auth_data.get("username", "")
        password = auth_data.get("password", "")
        auth_str = f"{username}:{password}"
        b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
        headers["Authorization"] = f"Basic {b64_auth}"
    elif auth_type == "apikey":
        key = auth_data.get("key")
        value = auth_data.get("value")
        add_to = auth_data.get("addTo", "header").lower()
        if key and value:
            if add_to == "header":
                headers[key] = value

@router.post("/execute", response_model=ExecuteResponse)
async def execute_request(req: ExecuteRequest, db: Session = Depends(get_db)):
    # 1. Resolve environment variables if environment_id is provided
    variables = {}
    if req.environment_id:
        db_vars = db.query(EnvironmentVariable).filter(
            EnvironmentVariable.environment_id == req.environment_id,
            EnvironmentVariable.enabled == True
        ).all()
        variables = {v.key: v.value for v in db_vars}

    # Resolve placeholders in URL, Headers, and Body
    resolved_url = resolve_placeholders(req.url, variables)
    
    resolved_headers = {}
    if req.headers:
        for k, v in req.headers.items():
            resolved_k = resolve_placeholders(k, variables)
            resolved_v = resolve_placeholders(v, variables)
            resolved_headers[resolved_k] = resolved_v

    resolved_body = resolve_placeholders(req.body, variables) if req.body else None

    # Resolve query params if any
    resolved_query_params = {}
    if req.query_params:
        for k, v in req.query_params.items():
            resolved_k = resolve_placeholders(k, variables)
            resolved_v = resolve_placeholders(v, variables)
            resolved_query_params[resolved_k] = resolved_v

    # 2. Apply auth headers
    apply_auth(resolved_headers, req.auth_type, req.auth_data)

    # Prepare HTTP client call
    timeout = httpx.Timeout(30.0)
    
    start_time = time.perf_counter()
    status_code = 0
    response_body = ""
    response_headers = {}
    response_size = 0
    error_message = None

    # Perform request
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            # Build request arguments
            kwargs = {
                "method": req.method.upper(),
                "url": resolved_url,
                "headers": resolved_headers,
                "params": resolved_query_params,
            }
            if resolved_body is not None:
                kwargs["content"] = resolved_body

            response = await client.request(**kwargs)
            
            # Record response data
            status_code = response.status_code
            response_body = response.text
            response_headers = {k: v for k, v in response.headers.items()}
            response_size = len(response.content)
            
    except httpx.TimeoutException:
        error_message = "Request timed out after 30 seconds."
    except httpx.ConnectError:
        error_message = "Connection failed. Please check the URL, DNS, or network connection."
    except httpx.HTTPError as e:
        error_message = f"HTTP Error occurred: {str(e)}"
    except Exception as e:
        error_message = f"An unexpected error occurred: {str(e)}"

    end_time = time.perf_counter()
    duration_ms = int((end_time - start_time) * 1000)

    # 3. Save to HistoryEntry
    history_entry = HistoryEntry(
        method=req.method,
        url=req.url,
        headers=req.headers,
        query_params=req.query_params,
        body=req.body,
        auth_type=req.auth_type,
        auth_data=req.auth_data,
        response_status=status_code,
        response_time_ms=duration_ms,
        response_size_bytes=response_size,
        response_headers=response_headers,
        response_body=response_body if not error_message else error_message
    )
    
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)

    # 4. Construct final response
    resolved_request_info = ResolvedRequestInfo(
        method=req.method.upper(),
        url=resolved_url,
        headers=resolved_headers,
        body=resolved_body
    )

    return ExecuteResponse(
        status_code=status_code,
        time_ms=duration_ms,
        size_bytes=response_size,
        headers=response_headers,
        body=response_body if not error_message else None,
        resolved_request=resolved_request_info,
        error_message=error_message
    )
