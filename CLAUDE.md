# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UIGen** — an AI-powered React component generator with live preview. Users describe components in a chat interface; the AI generates JSX files into an in-memory virtual file system, which is rendered live in an iframe.

## Commands

```bash
# First-time setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/path/to/file.test.ts

# Reset the SQLite database
npm run db:reset

# After changing prisma/schema.prisma, regenerate client and migrate
npx prisma generate && npx prisma migrate dev
```

`NODE_OPTIONS='--require ./node-compat.cjs'` is prepended to all Next.js commands via the npm scripts — this is required for compatibility and must not be removed.

Without `ANTHROPIC_API_KEY` in the environment, the app uses `MockLanguageModel` in `src/lib/provider.ts` and returns static component code instead of calling Claude.

## Architecture

### Virtual File System

`src/lib/file-system.ts` — `VirtualFileSystem` is the core abstraction. It's an in-memory tree of `FileNode` objects. All generated files live here; nothing is ever written to disk. The VFS is serialized to JSON and sent with every API request, then deserialized on the server to reconstruct state.

### AI Tooling

The AI is given two tools (`src/lib/tools/`):
- `str_replace_editor` — create files, replace strings, insert lines
- `file_manager` — rename or delete files

The system prompt (`src/lib/prompts/generation.tsx`) instructs the model to always produce a root `/App.jsx` as the entry point and use the `@/` import alias for local files.

### Live Preview Pipeline

`src/lib/transform/jsx-transformer.ts`:
1. Transforms each `.jsx`/`.tsx` file in the VFS using `@babel/standalone` (client-side Babel)
2. Creates blob URLs from transformed code
3. Builds an ES module import map (local files → blob URLs, third-party packages → `esm.sh`)
4. Injects the import map into a full HTML document rendered in an `<iframe>` (`PreviewFrame`)

Third-party npm packages imported in generated components are automatically resolved via `https://esm.sh/{package}`.

### State Management (React Contexts)

- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) — wraps `VirtualFileSystem`, exposes file CRUD, and handles `handleToolCall` which dispatches AI tool calls to the VFS
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, wires tool call callbacks to `FileSystemContext`, and serializes the VFS into every chat API request body

Both contexts are composed in `src/app/main-content.tsx`.

### Auth & Persistence

- JWT sessions via `jose`, stored in an `httpOnly` cookie (`src/lib/auth.ts`)
- `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes
- Prisma + SQLite — the schema in `prisma/schema.prisma` is the source of truth for all database structure; reference it whenever you need to understand stored data models
- The Prisma client is generated into `src/generated/prisma/` (not the default location)
- Anonymous users can work freely; projects are only saved when the user is authenticated and a `projectId` is present

### API Route

`src/app/api/chat/route.ts` — the single streaming endpoint. It reconstructs the VFS from the request body, calls `streamText` with the two tools, and on finish persists the updated VFS + messages to the database if the user is authenticated.

## Code Style

- Use comments sparingly. Only comment complex code.

## Key Conventions

- All non-library imports in generated components must use the `@/` alias (e.g., `@/components/Button`)
- The preview entry point priority: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.jsx` → first `.jsx/.tsx` found
- UI components use shadcn/ui (New York style, neutral base color) configured in `components.json`; Tailwind CSS v4 with `@tailwindcss/postcss`
- Tests use Vitest + jsdom + React Testing Library; test files are colocated in `__tests__/` directories
