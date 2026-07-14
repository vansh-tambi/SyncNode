from app.database import engine, Base
# Import models to ensure they are registered with Base metadata
from app.models import Collection, SavedRequest, Environment, EnvironmentVariable, HistoryEntry

def initialize_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")

if __name__ == "__main__":
    initialize_database()
