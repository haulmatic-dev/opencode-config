# Task Implementation Process - Visual Guide

## Local Development Process (Phase 1)

```mermaid
graph TD
    A[Developer] --> B[Install Code Quality Tools]
    B --> B1[ESLint, Prettier, Black, Pylint]
    B1 --> B2[Configure Pre-commit Hooks]
    B2 --> C[Install PM2]
    C --> C1[Create ecosystem.config.js]
    C1 --> D[Implement Headless Worker]
    D --> D1[Create headless-worker.js]
    D1 --> E[Create Test Scenarios]
    E --> E1[Basic Execution]
    E --> E2[File Conflicts]
    E --> E3[Task Failures]
    E --> E4[Worker Scaling]
    E1 --> F[Run Local Tests]
    E2 --> F
    E3 --> F
    E4 --> F
    F --> G[Validate Integration]
    G --> H[Ready for Production]
    
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style D fill:#e1f5ff
    style E fill:#fff4e6
    style F fill:#e8f5e9
    style H fill:#d4edda
```

## Headless Worker Execution Flow

```mermaid
sequenceDiagram
    participant PM2 as PM2 Process Manager
    participant Worker as Headless Worker
    participant Beads as Beads Task Queue
    participant MCP as MCP Agent Mail
    participant OC as opencode
    
    PM2->>Worker: Start worker
    Worker->>Beads: bd ready
    Beads-->>Worker: Task ID
    Worker->>MCP: reserve_file_paths()
    MCP-->>Worker: Granted/Denied
    
    alt File Reserved
        Worker->>OC: opencode-task <task-id>
        OC-->>Worker: Success/Failure
        
        alt Task Success
            Worker->>Beads: bd close <task-id>
            Worker->>MCP: release_file_reservations()
            Worker-->>PM2: Exit (process.exit(0))
            PM2->>Worker: Restart
        else Task Failure
            Worker->>Beads: bd create <dependent-task>
            Worker->>MCP: release_file_reservations()
            Worker-->>PM2: Exit (process.exit(1))
            PM2->>Worker: Restart
        end
    else File Reservation Denied
        Worker->>Worker: Wait 5s
        Worker->>MCP: reserve_file_paths() [Retry 1]
        
        alt Still Denied
            Worker->>Worker: Wait 5s
            Worker->>MCP: reserve_file_paths() [Retry 2]
            
            alt Still Denied
                Worker->>Worker: Wait 5s
                Worker->>MCP: reserve_file_paths() [Retry 3]
                
                alt Still Denied After 3 Retries
                    Worker-->>PM2: Exit (process.exit(1))
                    PM2->>Worker: Restart (claim different task)
                end
            end
        end
    end
```

## 6-Stage Iterative Workflow

```mermaid
graph LR
    subgraph Planning
        A0[Stage 0: Discovery & Planning]
        A0 --> A1[Stage 1: Test Specification]
    end
    
    subgraph Implementation
        A1 --> A2[Stage 2: Code Implementation]
        A2 --> A3[Stage 3: Static Analysis & Security]
    end
    
    subgraph Validation
        A3 --> A4[Stage 4: Test Execution]
        A4 --> A5[Stage 5: Code Review]
    end
    
    subgraph Deployment
        A5 --> A6[Stage 6: Deployment & Monitoring]
    end
    
    A4 -.->|Failures| B1[Create Dependent Tasks]
    A5 -.->|Review Comments| B2[Create Tasks by Type]
    A6 -.->|Deployment Issues| B3[Create Rollback/Investigate Tasks]
    
    B1 -.->|Retry| A2
    B2 -.->|Fix & Retry| A5
    B3 -.->|Fix & Retry| A6
    
    style A0 fill:#e3f2fd
    style A1 fill:#e3f2fd
    style A2 fill:#bbdefb
    style A3 fill:#ffcdd2
    style A4 fill:#fff3cd
    style A5 fill:#d4edda
    style A6 fill:#d1ecf1
    style B1 fill:#f8d7da
    style B2 fill:#f8d7da
    style B3 fill:#f8d7da
```

## Failure Handling & Task Creation

```mermaid
graph TD
    A[Stage Failure] --> B{Parse Failure Type}
    
    B -->|Test Failures| C1[Extract Failing Tests]
    C1 --> C2{Classify by Severity}
    C2 -->|Security/Core| C3[P0 Task]
    C2 -->|Integration/E2E| C4[P1 Task]
    C2 -->|Unit Edge Case| C5[P2 Task]
    C2 -->|Performance| C6[P3 Task]
    
    B -->|Review Comments| D1[Extract Comments]
    D1 --> D2{Classify by Type}
    D2 -->|Security| D3[P0: Fix Security Issues]
    D2 -->|Bug| D4[P0: Fix Review Bugs]
    D2 -->|Architecture| D5[P1: Refactor Architecture]
    D2 -->|Performance| D6[P1: Optimize Performance]
    D2 -->|Accessibility| D7[P1: Fix Accessibility]
    D2 -->|Documentation| D8[P2: Add Documentation]
    D2 -->|Style| D9[P3: Address Style]
    
    B -->|Deployment Issues| E1[Monitor Events]
    E1 --> E2{Issue Type}
    E2 -->|Deployment Failed| E3[P0: Rollback]
    E3 --> E4[P0: Investigate]
    E2 -->|Smoke Test Failed| E5[P0: Fix Smoke Tests]
    E2 -->|Health Check Failed| E6[P0: Fix Health Issues]
    
    C3 --> F[Create Task in Beads]
    C4 --> F
    C5 --> F
    C6 --> F
    D3 --> F
    D4 --> F
    D5 --> F
    D6 --> F
    D7 --> F
    D8 --> F
    D9 --> F
    E3 --> F
    E4 --> F
    E5 --> F
    E6 --> F
    
    F --> G[Link to Original Stage]
    G --> H{Retry Limit Reached?}
    
    H -->|No| I[Retry with Backoff]
    I -->|Retry 1| J[Immediate]
    I -->|Retry 2| K[5 min wait]
    I -->|Retry 3| L[15 min wait]
    
    J --> M[Re-run Stage]
    K --> M
    L --> M
    
    H -->|Yes| N[Alert Developer]
    N --> O[Create Manual Intervention Task]
    O --> P[Stop Auto-queuing]
    
    style A fill:#f8d7da
    style F fill:#fff3cd
    style M fill:#d4edda
    style P fill:#ffeaa7
```

## Cass Memory Learning Loop

```mermaid
graph TD
    A[Task Execution] --> B[Record Metrics]
    B --> C{Success or Failure?}
    
    C -->|Success| D[Extract Success Patterns]
    C -->|Failure| E[Extract Failure Patterns]
    
    D --> F[Analyze: Agent Type, Task Type, Duration]
    F --> G[Calculate: Success Rate, Avg Time]
    G --> H[Store in cass_memory: success_patterns]
    
    E --> I[Analyze: Stage, Failure Type, Error]
    I --> J[Calculate: Occurrence Count, Resolution Rate, Avg Time]
    J --> K[Identify: Root Cause, Recommended Action]
    K --> L[Store in cass_memory: failure_patterns]
    
    H --> M[New Task Starts]
    L --> M
    
    M --> N[Query cass_context]
    N --> O[Get: Relevant Rules, Anti-Patterns, History Snippets]
    O --> P[Include in Agent Prompt]
    P --> A
    
    style H fill:#d4edda
    style L fill:#f8d7da
    style O fill:#d1ecf1
```

## PM2 Worker Management

```mermaid
graph LR
    A[Developer] -->|pm2 start| B[PM2 Daemon]
    B --> C[Worker Instance 1]
    B --> D[Worker Instance 2]
    B --> E[Worker Instance 3]
    B --> F[Worker Instance 4]
    
    C --> G[Claim Task 1]
    D --> H[Claim Task 2]
    E --> I[Claim Task 3]
    F --> J[Claim Task 4]
    
    G --> K[Execute & Exit]
    H --> K
    I --> K
    K --> L[PM2 Auto-restart]
    
    L --> M[Claim Next Available Task]
    M --> N[Beads: bd ready]
    N --> O[MCP: reserve_file_paths]
    O --> P[opencode-task]
    P --> Q[Beads: bd close]
    Q --> K
    
    A -.->|pm2 scale 8| B
    A -.->|pm2 stop all| B
    A -.->|pm2 restart all| B
    A -.->|pm2 logs| B
    
    style B fill:#e1f5ff
    style K fill:#fff3cd
```

## Pre-commit Hook Flow

```mermaid
graph TD
    A[Developer: git commit] --> B[Husky: pre-commit hook]
    B --> C[Lint-staged: Get staged files]
    C --> D{File Extension?}
    
    D -->|*.js,*.ts| E[Run ESLint --fix]
    E --> F[Run Prettier --write]
    F --> G[Run TypeScript: tsc --noEmit]
    G --> H[git add]
    
    D -->|*.py| I[Run Black]
    I --> J[Run Pylint]
    J --> K[Run MyPy]
    K --> H
    
    H --> L{All Checks Pass?}
    L -->|Yes| M[Commit Allowed]
    L -->|No| N[Commit Blocked]
    N --> O[Show Errors/Warnings]
    O --> P[Developer Fixes Issues]
    P --> A
    
    style B fill:#ffcdd2
    style L fill:#f8d7da
    style M fill:#d4edda
```

## Success Criteria Flow

```mermaid
graph TD
    A[Task Complete] --> B{Stage 0-6 Passed?}
    
    B -->|No| C[Create Dependent Task]
    C --> D[Set Priority: P0-P4]
    D --> E[Link to Original Stage]
    E --> F[Exit Worker]
    
    B -->|Yes| G{Quality Gates Passed?}
    
    G -->|No| C
    
    G -->|Yes| H[Close Task in Beads]
    H --> I[Release File Reservations]
    I --> J[Exit Worker]
    J --> K[PM2 Restarts]
    K --> L[Claim Next Task]
    
    L --> M[ cass_memory: Learn from success/failure]
    M --> N[Metrics: Record duration, success, retries]
    N --> O[Next Stage or Feature]
    
    style C fill:#f8d7da
    style H fill:#d4edda
    style M fill:#d1ecf1
    style N fill:#fff3cd
```

## Local to Production Rollout

```mermaid
graph LR
    subgraph Phase 1: Local Development
        A1[Install Code Quality Tools]
        A1 --> A2[Install PM2]
        A2 --> A3[Implement Worker]
        A3 --> A4[Test Locally]
    end
    
    subgraph Phase 2: Staging
        B1[Deploy to Test Environment]
        B1 --> B2[Run Integration Tests]
        B2 --> B3[Validate with Multiple Workers]
    end
    
    subgraph Phase 3: Production
        C1[Deploy PM2 Config]
        C1 --> C2[Start Worker Pool]
        C2 --> C3[Monitor Performance]
        C3 --> C4[Scale as Needed]
    end
    
    A4 --> B1
    B3 --> C1
    
    style A4 fill:#d4edda
    style B3 fill:#fff3cd
    style C4 fill:#e1f5ff
```

## Metrics Collection Flow

```mermaid
graph TD
    A[Task Event] --> B[Metrics Agent]
    
    B --> C{Event Type}
    
    C -->|Task Completion| D[Record: Duration, Stage, Success]
    C -->|Stage Failure| E[Record: Stage, Failure Type, Error]
    C -->|AI Assistance| F[Record: Agent Type, Task ID, Duration]
    
    D --> G[Send to Metrics Backend]
    E --> G
    F --> G
    
    G --> H[Prometheus: Store Metrics]
    H --> I[Grafana: Display Dashboards]
    I --> J[Alert: PagerDuty/Slack]
    
    G --> K[ cass_memory: Learn Patterns]
    K --> L[Failure Patterns]
    K --> M[Success Patterns]
    
    L --> N[Generate Recommendations]
    M --> N
    N --> O[Apply to Future Tasks]
    
    style H fill:#e1f5ff
    style I fill:#e1f5ff
    style J fill:#f8d7da
    style K fill:#d1ecf1
```
