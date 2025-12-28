# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Novel Agent (AI小说续写系统) is an AI-powered novel continuation system built with Next.js that supports RAG (Retrieval-Augmented Generation), summary-based, and hybrid strategies for writing million-word novels.

**Tech Stack:** Next.js 16 (App Router), TypeScript 5, React 19, Tailwind CSS 4, PostgreSQL + pgvector, Prisma, NextAuth.js, OpenRouter API

## Common Commands

```bash
# Development
pnpm dev              # Start dev server on port 3000
pnpm build            # Production build
pnpm start            # Start production server

# Database
pnpm db:generate      # Generate Prisma client (run after schema changes)
pnpm db:migrate       # Run Prisma migrations
pnpm db:push          # Push schema changes without migration
pnpm db:studio        # Open Prisma Studio (database GUI)

# Testing
pnpm test             # Run tests with Vitest
pnpm test:ui          # Vitest UI mode
pnpm test:coverage    # Generate coverage report

# Code Quality
pnpm lint             # Run ESLint
```

**Package Manager:** This project uses `pnpm`. Always use `pnpm` commands instead of `npm` or `yarn`.

## Environment Variables

Required (see `env.example`):
- `DATABASE_URL` - PostgreSQL connection string with pgvector extension
- `NEXTAUTH_URL` - App URL (default: http://localhost:3000)
- `NEXTAUTH_SECRET` - Secret for JWT encryption
- `OPENROUTER_API_KEY` - Optional (users can provide their own)

## Architecture

### Database Schema (Prisma + PostgreSQL)

Key models with cascade delete relationships (user deletion cascades to all their data):

- **User** - Auth with username/password, stores optional OpenRouter API key, default model, and summary parameters (temperature, max tokens, embedding model)
- **Novel** - Main entity, has `maxContextLength` config for summary generation
- **Chapter** - Individual chapters with content, summary, word count, indexed by `(novelId, chapterIndex)`
- **Summary** - Three-tier summary system: `CHAPTER`, `VOLUME`, `GLOBAL` (enum `SummaryType`)
- **NovelMetadata** - JSON storage for characters, locations, timeline, world rules, key events
- **Embedding** - Vector embeddings (1536-dim pgvector) for semantic search
- **Continuation** - Records of AI continuation requests with strategies (RAG, SUMMARY, HYBRID)

### Directory Structure

```
app/                    # Next.js App Router
  api/                 # RESTful API routes
    novels/[id]/       # Novel CRUD, chapters, summaries, continuations
    auth/              # NextAuth endpoints
    openrouter/        # AI model integration
    user/              # User settings (API key, models, summary params)
components/
  auth/                # Login/register components
  novel/               # Novel-specific UI components
lib/                   # Business logic layer (IMPORTANT: core logic lives here)
  auth/                # Auth utilities
  continuation/        # Continuation strategies (RAG, SUMMARY, HYBRID)
  db/                  # Database access layer
  embeddings/          # Vector operations
  handlers/            # Shared API route handlers
  novel/               # Novel services (chapter parsing, etc.)
  openrouter/          # OpenRouter client
  summary/             # Summary generation
prisma/
  schema.prisma        # Database schema
```

### Key Architecture Patterns

1. **Business Logic in `lib/`** - Core services and database access layer are in `lib/`, not in API routes. API routes primarily handle HTTP concerns and delegate to `lib/` functions.

2. **User Isolation** - All novel operations are scoped to the authenticated user. Database queries must filter by `userId`.

3. **Three Continuation Strategies:**
   - `RAG` - Retrieves relevant chapters via vector similarity search using pgvector embeddings (cosine similarity: `1 - (embedding <=> query_vector)`), plus recent 3 chapters for context
   - `SUMMARY` - Uses global summaries, recent chapter summaries, and novel metadata
   - `HYBRID` (Recommended) - Combines RAG-retrieved chapters, global summary (compressed core plot only), recent chapter summaries, and top 5 key characters

4. **Novel Processing Pipeline:**
   - Upload TXT file → (Priority 1: User-provided regex OR Priority 2: LLM generates regex OR Priority 3: Single temporary chapter) → Split into chapters → Create embeddings → Generate summaries

5. **NextAuth.js** - Credentials provider with JWT strategy, stores sessions in database

6. **Shared Handlers Pattern** - `lib/handlers/userSettings.ts` provides reusable functions for user settings GET/PUT routes

### API Route Structure

RESTful nested routing under `/api/novels/[novelId]/`:

- `GET/POST /api/novels` - List/create novels
- `GET/PUT/DELETE /api/novels/[novelId]` - Novel operations
- `POST /api/novels/upload` - Upload TXT file
- `GET /api/novels/[novelId]/chapters/[chapterId]` - Get chapter
- `POST /api/novels/[novelId]/chapters/identify` - Auto-identify chapters with LLM
- `POST /api/novels/[novelId]/chapters/merge` - Merge chapters
- `GET/POST /api/novels/[novelId]/summaries/chapters/[chapterId]` - Chapter summaries
- `POST /api/novels/[novelId]/summaries/global/update` - Global summary
- `POST /api/novels/[novelId]/continue` - Generate continuation
- `POST /api/novels/[novelId]/continue/save` - Save continuation
- `POST /api/novels/[novelId]/continue/generate-prompt` - Auto-generate prompt
- `POST /api/novels/[novelId]/metadata/extract` - Extract metadata

Other routes:
- `POST /api/auth/register` - Register
- `GET/POST /api/auth/[...nextauth]` - NextAuth handler
- `PUT /api/user/api-key` - Update API key
- `PUT /api/user/default-model` - Update default model
- `PUT /api/user/default-embedding-model` - Update default embedding model
- `PUT /api/user/summary-temperature` - Update summary temperature parameter
- `PUT /api/user/summary-max-tokens` - Update summary max_tokens parameter
- `GET /api/openrouter/models` - List available AI models

### Core Services in lib/

Key business logic directories:

- **lib/db/** - Database access layer (novel CRUD, user operations, chapter merging)
- **lib/openrouter/** - OpenRouter API client (chat completions, embeddings)
- **lib/embeddings/** - Vector operations (generation, search, storage using pgvector)
- **lib/summary/** - Summary generation (chapter summaries with context, global summaries, metadata extraction)
- **lib/continuation/** - Continuation strategies (RAG, SUMMARY, HYBRID with unified interface)
- **lib/novel/** - Novel processing (chapter parsing via LLM or regex)
- **lib/auth/** - Authentication utilities (user registration)

### Path Aliases

`@/*` maps to the root directory. Use this for imports (e.g., `import { foo } from '@/lib/bar'`).

### Testing Setup

- **Framework:** Vitest with V8 coverage
- **Environment:** Node.js (set in `vitest.config.mts`)
- **Test files:** Match `**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`
- **Coverage excludes:** `app/`, `public/`, config files, types, tests
- **Test DB:** Uses `DATABASE_URL` env var or falls back to localhost postgres

### Code Conventions

- File naming: kebab-case for routes, camelCase for utilities
- API routes return consistent error responses with appropriate HTTP status codes
- Prisma queries use unique constraints defined in schema (e.g., `[novelId, chapterIndex]`)
- All user data deletes cascade when a user is deleted

### Important Implementation Details

**GLOBAL Summary Queries**: For `Summary` records with `type: GLOBAL`, the `targetId` field is `null`. When querying, use `findFirst()` with `{ novelId, type: 'GLOBAL', targetId: null }` instead of `findUnique()` because the unique constraint includes `targetId`.

**Chapter Merging**: When merging consecutive chapters, the system updates `chapterIndex` for all subsequent chapters to maintain the sequential index. This is handled in `lib/db/novel.ts`.

**Embedding Model**: Default embedding model is `openai/text-embedding-3-small` (1536 dimensions). Users can configure their preferred embedding model via user settings.
