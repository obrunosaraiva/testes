from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .database import engine
from .models import Base
from .routes import inbox, tasks, projects, dashboard, capture, auth, notifications

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GTD Manager",
    description="App de gestão GTD para gestores de projetos, com IA integrada via Claude.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(inbox.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(capture.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "../../frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_path, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(frontend_path, "index.html"))

    @app.get("/sw.js")
    def serve_sw():
        return FileResponse(
            os.path.join(frontend_path, "sw.js"),
            media_type="application/javascript",
            headers={"Service-Worker-Allowed": "/"},
        )


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "GTD Manager"}
