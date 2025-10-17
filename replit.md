# TELEBOT HOSTER

## Overview

TELEBOT HOSTER is a platform for deploying and managing Telegram bots. Users can upload their Python or Node.js bot code as ZIP files, configure environment variables, and manage bot lifecycles (start, stop, restart) through a web dashboard. The platform features token-based authentication, real-time log streaming via WebSockets, and an admin panel for user and access token management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React 18 with TypeScript for type safety and modern component patterns
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router

**UI Component Strategy**
- shadcn/ui component library built on Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for type-safe component variant management
- Dark mode as the primary interface with light mode as optional secondary theme

**Design System**
- Hybrid approach combining Material Design principles with modern SaaS aesthetics (inspired by Pella.app, Vercel, Railway.app)
- Custom color palette with HSL-based theming for dark/light mode switching
- Typography using Inter for UI text and JetBrains Mono for code/logs
- Elevation system using opacity-based overlays for hover/active states

**State Management**
- TanStack Query (React Query) for server state management with infinite stale time
- Custom hooks for authentication (`useAuth`) and UI interactions (`useToast`, `useIsMobile`)
- Session-based authentication state synchronized with backend

**Key Pages & Features**
- Landing page with token-based login flow
- Dashboard with bot list and deployment dialog
- Bot management page with live log streaming and environment variable management
- Admin panel for user/token CRUD operations

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for API routes and middleware
- HTTP server with WebSocket support (ws library) for real-time log streaming
- Session-based authentication using express-session with PostgreSQL session store (connect-pg-simple)

**Authentication System**
- Dual authentication strategy:
  1. Token-based login: Users authenticate with pre-issued access tokens
  2. Admin login: Username/password authentication for admin panel access
- Session cookies with 7-day TTL, HTTP-only and secure flags in production
- Middleware guards: `isAuthenticated` and `isAdmin` for route protection

**Bot Process Management**
- In-memory bot process tracking using Map data structures
- Child process spawning with Node.js `spawn` for running user bot code
- WebSocket-based log streaming with per-bot client management
- Support for Python and Node.js runtime environments

**File Upload & Processing**
- Multer middleware for handling ZIP file uploads (50MB limit)
- Unzipper for extracting bot code to temporary directories
- File system operations for bot code storage and cleanup

**API Structure**
- RESTful endpoints for CRUD operations on bots, environment variables, and access tokens
- WebSocket endpoints for real-time log streaming per bot
- Admin-specific routes for user and token management

### Data Storage

**Database**
- PostgreSQL (Neon serverless) as the primary database
- Drizzle ORM for type-safe database queries and migrations
- WebSocket connection using `ws` library for Neon serverless compatibility

**Schema Design**
- `users`: Stores user profiles with UUID primary keys
- `bots`: Bot metadata including name, runtime, status, and file paths (foreign key to users)
- `environment_variables`: Key-value pairs for bot configuration (foreign key to bots)
- `access_tokens`: Token-based authentication credentials (foreign key to users)
- `sessions`: Session storage for express-session (JSONB session data)

**Data Access Layer**
- Repository pattern with `DatabaseStorage` class implementing `IStorage` interface
- Abstracted CRUD operations for all entities
- Support for user upserts (create or update based on email uniqueness)

### External Dependencies

**Third-Party Services**
- Neon Database: PostgreSQL serverless database hosting
- Replit infrastructure: OAuth provider integration (partially implemented but unused in favor of token auth)

**Key npm Packages**
- **UI Components**: @radix-ui/* primitives, shadcn/ui components
- **Forms**: react-hook-form with @hookform/resolvers and zod for validation
- **Database**: drizzle-orm, @neondatabase/serverless, pg (PostgreSQL client)
- **File Processing**: multer (uploads), unzipper (ZIP extraction)
- **Authentication**: express-session, connect-pg-simple, passport (for potential Replit OAuth)
- **Real-time**: ws (WebSocket server)
- **Utilities**: nanoid (unique ID generation), date-fns (date formatting), memoizee (caching)

**Development Tools**
- TypeScript for type safety across full stack
- ESBuild for server bundling in production
- Vite plugins for Replit integration (cartographer, dev-banner, runtime-error-modal)

**Design Assets**
- Google Fonts: Inter (UI text) and JetBrains Mono (code/monospace)
- Lucide React for icons
- React Icons for brand icons (Python, Node.js, Telegram)