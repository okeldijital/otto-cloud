# AI Module - Phase 1 RUNBOOK

## Overview
This document describes the AI module implementation (Phase 1: Read-only) for the OTTO application.

## Feature Flag
The AI module is controlled by the `AI_ENABLED` environment variable:
- **Default**: `False` (disabled)
- **Location**: `backend/config.py`
- **Environment Variable**: `AI_ENABLED=true` or `AI_ENABLED=false`

## Database Migration

### Running the Migration
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

### Migration Details
- **File**: `backend/alembic/versions/f3fd1345ac5b_add_ai_tables.py`
- **Tables Created**:
  - `ai_sessions` - Stores AI chat sessions
  - `ai_messages` - Stores chat messages (user and assistant)
  - `ai_audit_log` - Audit trail for AI requests

### Rollback
```bash
alembic downgrade -1
```

## Enabling AI Module

### Method 1: Environment Variable
Add to `backend/.env`:
```bash
AI_ENABLED=true
```

### Method 2: Direct Config
Edit `backend/config.py`:
```python
AI_ENABLED: bool = True
```

### Restart Required
After changing the flag, restart the backend:
```bash
# Kill existing backend process
# Then restart
cd backend && source venv/bin/activate && python main.py
```

## Architecture

### Backend Structure
```
backend/
├── models/ai.py                    # Database models
├── schemas/ai.py                   # Pydantic schemas
├── routes/ai.py                    # API endpoints
└── services/ai/
    ├── __init__.py
    ├── audit.py                    # Audit logging
    ├── tools.py                    # Tool implementations
    └── registry.py                 # Tool registry
```

### Frontend Structure
```
frontend/src/
├── api/aiClient.js                 # API client
├── pages/AI.jsx                    # Chat UI
├── App.jsx                         # Route registration
└── components/layout/Sidebar.jsx   # Conditional link
```

## API Endpoints

### GET /api/ai/health
**Purpose**: Check if AI is enabled  
**Auth**: Not required  
**Response**:
```json
{
  "status": "ok",
  "enabled": true,
  "version": "1.0.0"
}
```

### GET /api/ai/tools
**Purpose**: List available tools  
**Auth**: Required  
**Response**:
```json
{
  "tools": [
    {
      "name": "search_catalog",
      "description": "Search artists, tracks, works, and releases in your catalog",
      "read_only": true
    },
    {
      "name": "search_network",
      "description": "Search individuals and organizations in your network",
      "read_only": true
    },
    {
      "name": "help_tips",
      "description": "Get helpful tips on using the AI assistant",
      "read_only": true
    }
  ]
}
```

### POST /api/ai/chat
**Purpose**: Send chat message  
**Auth**: Required  
**Request**:
```json
{
  "message": "find: midnight groove",
  "session_id": null
}
```

**Response**:
```json
{
  "session_id": 123,
  "messages": [
    {
      "role": "user",
      "content": "find: midnight groove",
      "created_at": "2026-02-14T00:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Found 3 results for 'midnight groove'...",
      "created_at": "2026-02-14T00:00:01Z"
    }
  ],
  "results": [
    {
      "type": "track",
      "id": 1,
      "label": "Midnight Groove",
      "metadata": {"isrc": "US1234567890"}
    }
  ]
}
```

## Available Tools (Phase 1)

### 1. search_catalog
- **Purpose**: Search catalog entities
- **Searches**: Artists, Tracks, Works, Releases
- **Org-scoped**: Yes
- **Read-only**: Yes

### 2. search_network
- **Purpose**: Search network entities
- **Searches**: Individuals, Organizations
- **Org-scoped**: Yes
- **Read-only**: Yes

### 3. help_tips
- **Purpose**: Return static help tips
- **Database**: No
- **Read-only**: Yes

## User Workflow

### Accessing AI
1. Enable AI module (see above)
2. Restart backend
3. Login to OTTO
4. Click "AI Assistant" in sidebar (appears only when enabled)

### Using AI Chat
1. Type a message in the input box
2. Use "find:" prefix for searches
   - Example: `find: midnight groove`
3. Click on results to navigate to detail pages

### Search Examples
- `find: john smith` - Search catalog and network
- `find: midnight` - Search all entities
- `What can you help me with?` - Get help tips

## Audit Logging

### Purpose
All AI requests are logged for compliance and monitoring.

### What is Logged
- Organization ID
- User ID
- Action type ('chat', 'tool_execution')
- Tool name (if applicable)
- Request hash (SHA256, not full prompt)
- Timestamp

### What is NOT Logged
- Full message content (only hash)
- Response content
- Personal data

### Viewing Audit Logs
```sql
SELECT * FROM ai_audit_log 
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 100;
```

## Security & Compliance

### Organization Scoping
- All searches are scoped to user's organization
- No cross-org data leakage
- Enforced at database query level

### Authentication
- All endpoints (except /health) require authentication
- Uses existing OTTO auth system
- JWT token validation

### Read-Only Phase 1
- No writes to catalog/network
- No data modifications
- No external LLM calls
- No background jobs

## Testing

### Backend Tests
```bash
cd backend
pytest tests/test_ai.py -v
```

**Required Tests**:
1. `test_ai_disabled_returns_404` - Verify 404 when disabled
2. `test_ai_org_scoped_search_catalog` - Verify org scoping
3. `test_ai_org_scoped_search_network` - Verify org scoping
4. `test_ai_requires_auth` - Verify authentication
5. `test_ai_audits_chat_requests` - Verify audit logging

### Frontend Smoke Test
1. Open `/ai` page
2. Type `find: test`
3. Verify results appear
4. Click a result
5. Verify navigation to detail page
6. Check browser console for errors

## Troubleshooting

### AI Link Not Appearing in Sidebar
**Cause**: AI_ENABLED is False or backend not restarted  
**Solution**:
1. Check `backend/.env` has `AI_ENABLED=true`
2. Restart backend
3. Clear browser cache
4. Check `/api/ai/health` returns `enabled: true`

### 404 Errors on /api/ai/*
**Cause**: AI module not mounted  
**Solution**:
1. Verify `AI_ENABLED=true` in config
2. Check backend logs for "🤖 AI module enabled"
3. Restart backend

### No Search Results
**Cause**: Empty database or org scoping issue  
**Solution**:
1. Verify data exists in catalog/network
2. Check user's organization_id matches data
3. Review backend logs for SQL queries

### Audit Log Not Recording
**Cause**: Database migration not run  
**Solution**:
1. Run `alembic upgrade head`
2. Verify `ai_audit_log` table exists
3. Check database permissions

## Performance Considerations

### Message History
- Only last 10 messages per session are returned
- Older messages remain in database
- Consider cleanup job for old sessions (future)

### Search Limits
- Catalog search: 10 results max
- Network search: 10 results max
- Combined: 20 results max

### Database Indexes
All critical fields are indexed:
- `ai_sessions.organization_id`
- `ai_messages.session_id`
- `ai_audit_log.organization_id`
- `ai_audit_log.user_id`
- `ai_audit_log.created_at`

## Future Enhancements (Not in Phase 1)

### Phase 2 Possibilities
- External LLM integration (OpenAI, Anthropic)
- Write operations with approval workflow
- Advanced analytics queries
- Natural language report generation
- Batch operations
- Scheduled tasks

### Not Implemented Yet
- ❌ External LLM calls
- ❌ Write operations
- ❌ Background jobs
- ❌ Document text extraction
- ❌ Contract analysis
- ❌ Automated workflows

## Acceptance Criteria Checklist

### With AI_ENABLED=true
- ✅ `/ai` page loads
- ✅ `find:` queries return real DB matches
- ✅ Results are org-scoped
- ✅ No writes occur anywhere
- ✅ Audit rows created
- ✅ Sidebar shows "AI Assistant" link

### With AI_ENABLED=false
- ✅ No sidebar item
- ✅ `/api/ai/*` returns 404
- ✅ `/api/ai/health` returns `enabled: false`

## Support

### Logs Location
- Backend: `~/.otto/data/logs/otto.log`
- Frontend: Browser console

### Common Log Messages
- `🤖 AI module enabled` - AI successfully mounted
- `🤖 AI module disabled (AI_ENABLED=False)` - AI not mounted

### Debug Mode
Set `DEBUG=True` in `.env` for verbose logging.

## Changelog

### Version 1.0.0 (2026-02-14)
- Initial Phase 1 implementation
- Read-only catalog and network search
- Audit logging
- Feature flag control
- No external dependencies
