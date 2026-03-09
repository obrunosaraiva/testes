from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from .database import Base


class ListType(str, enum.Enum):
    NEXT_ACTION = "next_action"
    WAITING = "waiting"
    SOMEDAY = "someday"
    REFERENCE = "reference"
    TRASH = "trash"
    CALENDAR = "calendar"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    DONE = "done"
    DELEGATED = "delegated"
    CANCELLED = "cancelled"


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class InboxItem(Base):
    __tablename__ = "inbox_items"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    source = Column(String(100), default="manual")  # manual, image:whatsapp, whatsapp:GroupName, etc.
    gtd_data = Column(Text, nullable=True)  # JSON pre-filled by Vision/WhatsApp bot
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String(20), default="pending")  # pending, clarified, processed


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(20), default=ProjectStatus.ACTIVE)
    completion_pct = Column(Float, default=0.0)
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tasks = relationship("Task", back_populates="project")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    list_type = Column(String(30), nullable=False)  # ListType value
    context = Column(String(100))  # @reuniao, @email, @decisao, @leitura, etc.
    status = Column(String(20), default=TaskStatus.PENDING)
    priority = Column(String(10), default="medium")  # low, medium, high, urgent
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    assigned_to = Column(String(255), nullable=True)  # for delegated/waiting tasks
    waiting_since = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    decision_rationale = Column(Text, nullable=True)  # for decision tasks
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="tasks")


class WeeklyReview(Base):
    __tablename__ = "weekly_reviews"

    id = Column(Integer, primary_key=True, index=True)
    week_start = Column(DateTime, nullable=False)
    completed = Column(Boolean, default=False)
    inbox_cleared = Column(Boolean, default=False)
    projects_reviewed = Column(Boolean, default=False)
    waiting_reviewed = Column(Boolean, default=False)
    someday_reviewed = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
