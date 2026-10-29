# Smart Healthcare PM System — ER Diagram

> Concise overview of the main database entities and their relationships.  
> The complete implementation is defined in [`schema.sql`](./schema.sql).

```mermaid
erDiagram
    PROJECT_CHARTER ||--o| PROJECT_PLAN : has
    PROJECT_CHARTER ||--o| PROJECT_CLOSURE : closes

    REQUIREMENTS ||--o{ WBS_ITEMS : traces
    REQUIREMENTS ||--o{ CHANGE_REQUEST_REQUIREMENTS : links
    CHANGE_REQUESTS ||--o{ CHANGE_REQUEST_REQUIREMENTS : contains

    WBS_ITEMS ||--o{ WBS_ITEMS : parent
    WBS_ITEMS ||--o{ ACTIVITIES : contains
    WBS_ITEMS ||--o{ QUALITY_CHECKLISTS : validates

    TEAM_MEMBERS ||--o{ ACTIVITIES : assigned
    TEAM_MEMBERS ||--o{ EXPENSES : logs
    TEAM_MEMBERS ||--o{ DEFECTS : assigned

    ACTIVITIES ||--o{ ACTIVITY_DEPENDENCIES : predecessor
    ACTIVITIES ||--o{ ACTIVITY_DEPENDENCIES : successor
    ACTIVITIES ||--o{ EXPENSES : incurs
    ACTIVITIES ||--o{ PROGRESS_LOG : tracks
    ACTIVITIES ||--o{ DEFECTS : contains
    ACTIVITIES ||--o{ MILESTONES : reaches

    QUALITY_CHECKLISTS ||--o{ CHECKLIST_ITEMS : contains
    CHECKLIST_ITEMS ||--o{ INSPECTION_RESULTS : records

    RISKS ||--o{ PDPC_NODES : informs
    PDPC_NODES ||--o{ PDPC_NODES : parent

    PROJECT_CHARTER {
        int id PK
        string title
        real approved_budget
        date start_date
        date end_date
    }

    PROJECT_PLAN {
        int id PK
        int charter_id FK
        string scope_notes
        string schedule_notes
    }

    TEAM_MEMBERS {
        int id PK
        string name
        string role
        real daily_rate
    }

    STAKEHOLDERS {
        int id PK
        string name
        string influence
        string interest
    }

    REQUIREMENTS {
        int id PK
        string code UK
        string title
        string priority
        string status
    }

    CHANGE_REQUESTS {
        int id PK
        string code UK
        string title
        real cost_impact
        real schedule_impact_weeks
        string status
    }

    CHANGE_REQUEST_REQUIREMENTS {
        int id PK
        int change_request_id FK
        int requirement_id FK
    }

    WBS_ITEMS {
        int id PK
        string code UK
        string title
        int parent_id FK
        int requirement_id FK
        boolean is_work_package
    }

    ACTIVITIES {
        int id PK
        string code UK
        string name
        int wbs_item_id FK
        int assignee_id FK
        int duration
        real estimated_cost
        date planned_start
        date planned_end
        int percent_complete
        string status
    }

    ACTIVITY_DEPENDENCIES {
        int id PK
        int activity_id FK
        int predecessor_id FK
        string dependency_type
        int lag_days
    }

    MILESTONES {
        int id PK
        string name
        date planned_date
        date actual_date
        string status
    }

    EXPENSES {
        int id PK
        int activity_id FK
        int logged_by FK
        real amount
        date expense_date
    }

    PROGRESS_LOG {
        int id PK
        int activity_id FK
        date date
        int percent_complete
    }

    EVM_SNAPSHOTS {
        int id PK
        date snapshot_date
        real pv
        real ev
        real ac
        real cpi
        real spi
    }

    DEFECTS {
        int id PK
        string code UK
        string title
        string severity
        string status
        int activity_id FK
        int assigned_to FK
    }

    QUALITY_CHECKLISTS {
        int id PK
        string name
        string phase
        int wbs_id FK
    }

    CHECKLIST_ITEMS {
        int id PK
        int checklist_id FK
        string check_item
        boolean is_mandatory
    }

    INSPECTION_RESULTS {
        int id PK
        int item_id FK
        string result
        date inspection_date
    }

    RISKS {
        int id PK
        string code UK
        string title
        int likelihood
        int impact
        int score
        string status
    }

    PDPC_NODES {
        int id PK
        int parent_id FK
        int risk_id FK
        string node_type
        string title
    }

    PROJECT_CLOSURE {
        int id PK
        int charter_id FK
        date planned_end_date
        date actual_end_date
        real final_cost
        string status
    }
```

## Supporting tables

- `settings` stores status-date and threshold configuration.
- `audit_log` stores important create, update, delete, and approval events.
