# Mermaid Diagram Examples

This document showcases various Mermaid diagram types supported by BarkDown.
Based on [GitHub's Mermaid support](https://github.blog/developer-skills/github/include-diagrams-markdown-files-mermaid/).

---

## 1. Simple Flowchart

A basic directed graph showing connections between nodes:

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

## 2. Flowchart with Labels

Flowchart with descriptive labels and different node shapes:

```mermaid
flowchart LR
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> E((Fix Code))
    E --> B
    C --> F[Deploy]
```

## 3. Flowchart Direction Variants

### Top to Bottom (TB)
```mermaid
flowchart TB
    User --> Frontend
    Frontend --> API
    API --> Database
```

### Left to Right (LR)
```mermaid
flowchart LR
    Input --> Process --> Output
```

## 4. Sequence Diagram

Shows interactions between participants over time:

```mermaid
sequenceDiagram
    participant Browser
    participant Server
    participant Database
    
    Browser->>Server: HTTP Request
    activate Server
    Server->>Database: Query Data
    activate Database
    Database-->>Server: Return Results
    deactivate Database
    Server-->>Browser: HTTP Response
    deactivate Server
```

## 5. Sequence Diagram with Notes and Loops

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Auth
    participant API
    
    User->>App: Login Request
    App->>Auth: Validate Credentials
    
    alt Valid Credentials
        Auth-->>App: Token
        App-->>User: Login Success
        
        loop Every 5 minutes
            App->>API: Refresh Token
            API-->>App: New Token
        end
    else Invalid Credentials
        Auth-->>App: Error
        App-->>User: Login Failed
    end
    
    Note over User,API: This shows authentication flow
```

## 6. Class Diagram

UML class diagram showing relationships:

```mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    
    class Zebra{
        +bool is_wild
        +run()
    }
```

## 7. State Diagram

Shows state transitions:

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Success : Complete
    Processing --> Error : Fail
    Error --> Idle : Reset
    Success --> Idle : Reset
    Success --> [*]
```

## 8. Entity Relationship Diagram

Database ER diagram:

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string name
        string email
        int id PK
    }
    ORDER ||--|{ LINE_ITEM : contains
    ORDER {
        int id PK
        date created_at
        string status
    }
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    PRODUCT {
        int id PK
        string name
        float price
    }
    LINE_ITEM {
        int quantity
        float unit_price
    }
```

## 9. Gantt Chart

Project timeline visualization:

```mermaid
gantt
    title Project Development Timeline
    dateFormat YYYY-MM-DD
    
    section Planning
    Requirements     :done, req, 2024-01-01, 7d
    Design           :done, des, after req, 10d
    
    section Development
    Backend API      :active, api, 2024-01-18, 14d
    Frontend UI      :ui, after api, 14d
    Integration      :int, after ui, 7d
    
    section Testing
    Unit Tests       :test1, after int, 5d
    Integration Tests:test2, after test1, 5d
    
    section Deployment
    Staging          :stage, after test2, 3d
    Production       :prod, after stage, 2d
```

## 10. Pie Chart

Simple pie chart:

```mermaid
pie title Programming Languages Usage
    "JavaScript" : 40
    "Python" : 30
    "TypeScript" : 15
    "Go" : 10
    "Other" : 5
```

## 11. User Journey Diagram

Customer experience mapping:

```mermaid
journey
    title User Onboarding Journey
    section Sign Up
        Visit Website: 5: User
        Click Sign Up: 4: User
        Fill Form: 3: User
        Verify Email: 2: User, System
    section First Use
        Login: 5: User
        View Dashboard: 4: User
        Create First Item: 3: User
        Complete Tutorial: 5: User, System
    section Engagement
        Return Next Day: 4: User
        Invite Friend: 3: User
```

## 12. Git Graph

Visualize git branching:

```mermaid
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Add feature A"
    branch feature-b
    checkout feature-b
    commit id: "Start feature B"
    commit id: "WIP"
    checkout develop
    commit id: "Fix bug"
    checkout feature-b
    commit id: "Complete feature B"
    checkout develop
    merge feature-b tag: "v1.1"
    checkout main
    merge develop tag: "v1.0-release"
    commit id: "Hotfix"
```

## 13. Mindmap

Hierarchical concept visualization:

```mermaid
mindmap
    root((Web Development))
        Frontend
            HTML
            CSS
            JavaScript
                React
                Vue
                Angular
        Backend
            Node.js
            Python
            Go
        Database
            SQL
                PostgreSQL
                MySQL
            NoSQL
                MongoDB
                Redis
        DevOps
            Docker
            Kubernetes
            CI/CD
```

## 14. Timeline

Historical or event timeline:

```mermaid
timeline
    title Software Development Evolution
    1970s : Assembly Language
          : C Language Created
    1980s : C++ Emerges
          : Object-Oriented Programming
    1990s : Java Released
          : JavaScript Created
          : Python Gains Popularity
    2000s : Ruby on Rails
          : Node.js
    2010s : TypeScript
          : Go Language
          : Rust
    2020s : AI-Assisted Coding
          : WebAssembly
```

## 15. Quadrant Chart

Position mapping on two axes:

```mermaid
quadrantChart
    title Technology Adoption Matrix
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Strategic Investment
    quadrant-2 Quick Wins
    quadrant-3 Reconsider
    quadrant-4 Major Projects
    AI Integration: [0.8, 0.9]
    Code Review Tools: [0.3, 0.7]
    Legacy Cleanup: [0.7, 0.3]
    Documentation: [0.2, 0.4]
    Microservices: [0.9, 0.6]
```

## 16. Flowchart with Styling

Custom styled flowchart:

```mermaid
flowchart TD
    subgraph Frontend
        A[React App] --> B[Redux Store]
        B --> C[Components]
    end
    
    subgraph Backend
        D[Express Server] --> E[Controllers]
        E --> F[Services]
    end
    
    subgraph Database
        G[(PostgreSQL)]
        H[(Redis Cache)]
    end
    
    C --> D
    F --> G
    F --> H
    
    style A fill:#61dafb,stroke:#333
    style D fill:#68a063,stroke:#333
    style G fill:#336791,stroke:#333,color:#fff
    style H fill:#dc382d,stroke:#333,color:#fff
```

---

## Notes

- Mermaid diagrams are rendered client-side using the mermaid.js library
- The `katex` option must be enabled in extension settings for diagram rendering
- Some newer diagram types may require updated mermaid.js versions
- Diagrams are responsive and render as SVG for crisp display at any size
