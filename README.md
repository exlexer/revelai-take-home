# Patient Journey Automation Platform

https://github.com/user-attachments/assets/c2826f00-08bd-49ee-99fb-fb4fb8556528

## 🏗️ Architecture

```
         ┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
 User ──▶│   Express API   │───▶│ Redis Queue  │───▶│ Background      │
         │   (REST)        │    │ (BullMQ)     │    │ Worker          │
         └─────────────────┘    └──────────────┘    └─────────────────┘
                  │                                          │
                  ▼                                          │
         ┌─────────────────┐                                 │
         │   PostgreSQL    │◀────────────────────────────────┘
         │   Database      │
         └─────────────────┘
```

Depending on systems dependent on status updates, I expect the worker to be the bottleneck, thus was built with horizontal scaling in mind.
The Express API is stateless and can be scaled horizontally as well behind a load balancer as needed.

**Components:**
- **Express API**: HTTP endpoints for journey management and status checking
- **PostgreSQL**: Persistent storage for journeys, runs, nodes, and execution logs
- **Redis + BullMQ**: Message queue for asynchronous job processing
- **Worker Process**: Executes journey nodes with conditional logic and delays

### Prerequisites
- Node.js
- PostgreSQL
- Redis 7+
- Docker (optional)

### Quick Start

1. **Clone and Install**
```bash
git clone <repository>
cd revelai-take-home
npm install
```

2. **Setup Environment**
```bash
cp .env.example .env
# Configure database and Redis connections
```

3. **Start Services**
```bash
docker-compose up -d
```

4. **Database Setup**
```bash
npm run db:migrate
```

5. **Start Application**
```bash
npm run dev          # API server
npm run worker       # Background worker
```

## 🧪 Testing

The platform includes comprehensive testing across three levels:

```bash
# Integration tests (real DB/Redis, no worker)
npm run test:integration

# E2E tests (full system including worker)
npm run test:e2e

# All tests
npm run test:all
```

### Test Architecture
- **Integration**: API endpoints with real database/Redis but mocked worker
- **E2E**: Complete workflows including background job processing
