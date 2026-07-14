# seed.py
import json
from datetime import datetime
from backend.app.database import SessionLocal, engine, Base
from backend.app import models

# Recreate tables to start clean
Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    try:
        # Clear existing data
        db.query(models.HistoryEntry).delete()
        db.query(models.EnvironmentVariable).delete()
        db.query(models.Environment).delete()
        db.query(models.SavedRequest).delete()
        db.query(models.Collection).delete()
        db.commit()

        # 1. Add Collections
        col_jp = models.Collection(name="JSONPlaceholder API", description="Placeholder resources for testing")
        col_hb = models.Collection(name="HTTPBin Sandbox", description="HTTP Request & Response Service")
        db.add(col_jp)
        db.add(col_hb)
        db.commit()
        db.refresh(col_jp)
        db.refresh(col_hb)

        # 2. Add Requests inside Collections
        req1 = models.SavedRequest(
            collection_id=col_jp.id,
            name="Get Single Post",
            method="GET",
            url="{{base_url}}/posts/1",
            headers={"Accept": "application/json"},
            query_params={},
            body_type="none",
            body="",
            auth_type="none",
            auth_data={},
            order=0
        )
        req2 = models.SavedRequest(
            collection_id=col_jp.id,
            name="Create New Post",
            method="POST",
            url="{{base_url}}/posts",
            headers={"Content-Type": "application/json"},
            query_params={},
            body_type="raw",
            body=json.dumps({"title": "SyncNode Post", "body": "Cyberpunk API runner", "userId": 1}, indent=2),
            auth_type="none",
            auth_data={},
            order=1
        )
        req3 = models.SavedRequest(
            collection_id=col_hb.id,
            name="Request Debug Info",
            method="GET",
            url="{{base_url}}/get",
            headers={"User-Agent": "SyncNode/1.0.0"},
            query_params={"source": "client"},
            body_type="none",
            body="",
            auth_type="none",
            auth_data={},
            order=0
        )
        req4 = models.SavedRequest(
            collection_id=col_hb.id,
            name="Outbound Echo Post",
            method="POST",
            url="{{base_url}}/post",
            headers={"Content-Type": "application/json"},
            query_params={},
            body_type="raw",
            body=json.dumps({"echo": "Hello Gateway!"}, indent=2),
            auth_type="none",
            auth_data={},
            order=1
        )
        db.add_all([req1, req2, req3, req4])

        # 3. Add Environments
        env_dev = models.Environment(name="Development Server", is_active=True)
        env_prod = models.Environment(name="Production Server", is_active=False)
        db.add(env_dev)
        db.add(env_prod)
        db.commit()
        db.refresh(env_dev)
        db.refresh(env_prod)

        # 4. Add Environment Variables
        var_dev = models.EnvironmentVariable(
            environment_id=env_dev.id,
            key="base_url",
            value="https://jsonplaceholder.typicode.com",
            enabled=True
        )
        var_hb_dev = models.EnvironmentVariable(
            environment_id=env_dev.id,
            key="httpbin_url",
            value="https://httpbin.org",
            enabled=True
        )
        var_prod = models.EnvironmentVariable(
            environment_id=env_prod.id,
            key="base_url",
            value="https://httpbin.org",
            enabled=True
        )
        db.add_all([var_dev, var_hb_dev, var_prod])

        # 5. Add History Logs
        hist1 = models.HistoryEntry(
            method="GET",
            url="https://jsonplaceholder.typicode.com/posts/1",
            headers={"Accept": "application/json"},
            query_params={},
            body="",
            auth_type="none",
            auth_data={},
            response_status=200,
            response_time_ms=108,
            response_size_bytes=292,
            response_headers={"Content-Type": "application/json; charset=utf-8"},
            response_body=json.dumps({"userId": 1, "id": 1, "title": "Delectus Post", "body": "Sample post body content"}, indent=2)
        )
        hist2 = models.HistoryEntry(
            method="POST",
            url="https://httpbin.org/post",
            headers={"Content-Type": "application/json"},
            query_params={},
            body=json.dumps({"message": "ping"}, indent=2),
            auth_type="none",
            auth_data={},
            response_status=200,
            response_time_ms=194,
            response_size_bytes=425,
            response_headers={"Content-Type": "application/json"},
            response_body=json.dumps({"json": {"message": "ping"}, "url": "https://httpbin.org/post"}, indent=2)
        )
        db.add_all([hist1, hist2])
        db.commit()

        print("SQLite Database seeded successfully with realistic SyncNode datasets!")
    except Exception as e:
        db.rollback()
        print("Failed seeding DB:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
