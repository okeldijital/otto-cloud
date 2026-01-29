# OTTO - Record Label Operating System Documentation

## Introduction
OTTO is a comprehensive ERP solution for independent record labels. It manages everything from catalog and contracts to daily operations and analytics.

## Getting Started
1.  **Backend Setup**:
    ```bash
    cd backend
    pip install -r requirements.txt
    python scripts/seed_admin.py # Creates admin@otto.com / admin123
    uvicorn main:app --reload
    ```
2.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Core Modules
- **Dashboard**: High-level KPIs and recent activity.
- **Catalog**: Manage Artists, Labels, Releases, and Tracks.
- **Contracts**: Legal registry and royalty rate tracking.
- **CRM**: Distribution partners management.
- **Planner Suite**:
    - **Tasks**: Kanban board for release workflows.
    - **Events**: Calendar for release dates and tours.
    - **Notes**: Collaborative notes with entity linking.
    - **Playlists**: Track grouping for promotion.
- **Analytics**: Performance charts and financial reports.

## Admin Features
- **User Management**: Accessible via the "Admin" link in the sidebar for users with admin roles.
- **Backups**: System-wide database and uploads backup in the Admin panel.

## Docker Deployment
Run the entire stack with a single command:
```bash
docker-compose up --build
```

---
*Created by Antigravity*
