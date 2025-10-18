# TELEBOT HOSTER

## Overview

TELEBOT HOSTER is a modern platform for deploying and managing Telegram bots with ease. Users can upload Python or Node.js bot code as ZIP files and deploy them instantly with real-time monitoring through WebSocket-based log streaming. The platform supports a tiered user system (FREE and PREMIUM) with token-based authentication using BACK-XXXX format tokens.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing instead of React Router

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management, caching, and API interactions
- Custom authentication hook (`useAuth`) for managing user authentication state
- Query client configured with specific unauthorized behavior handling

**UI/UX Layer**
- Shadcn/UI component library (New York style variant) for consistent design system
- TailwindCSS with extensive customization including:
  - Custom color system with HSL-based variables for light/dark mode
  - Elevation system using rgba overlays (`--elevate-1`, `--elevate-2`)
  - Button outline system with configurable borders
- Theme system with context-based dark/light mode toggle
- Real-time WebSocket integration for live bot log streaming

**Component Architecture**
- Page-based routing with dedicated pages: Landing, Dashboard, Bot Management, Admin Panel, Token Login
- Reusable UI components from Radix UI primitives wrapped with Shadcn styling
- Form handling with React Hook Form and Zod validation via `@hookform/resolvers`

### Backend Architecture

**Server Framework**
- Node.js with Express for HTTP server and API endpoints
- HTTP server wrapped with WebSocket support using `ws` library
- Custom middleware for request logging with duration tracking and JSON response capture

**Authentication & Session Management**
- Dual authentication system:
  1. Token-based authentication using custom BACK-XXXX format tokens stored in database
  2. Session-based authentication with express-session
- Session storage configured with PostgreSQL backend using `connect-pg-simple`
- Middleware guards: `isAuthenticated` and `isAdmin` for route protection
- Admin credentials configured via environment variables with production validation

**Bot Process Management**
- In-memory bot process tracking using Map data structures
- File upload handling via Multer with 50MB size limit
- Bot runtime support for Python and Node.js
- ZIP file extraction using unzipper package
- Process spawning using Node.js `child_process` module
- WebSocket-based real-time log streaming with client management via Map of WebSocket Sets

**Storage Abstraction**
- Interface-based storage pattern (`IStorage`) allowing swappable implementations
- Two storage implementations:
  1. **DatabaseStorage**: PostgreSQL with Drizzle ORM
  2. **MongoStorage**: MongoDB with Mongoose (legacy/alternative)
- Storage operations include CRUD for users, bots, environment variables, and access tokens

**API Structure**
- RESTful endpoints under `/api` prefix:
  - `/api/auth/*` - Authentication endpoints (token-login, user info, logout)
  - `/api/admin/*` - Admin panel operations (user/token management)
  - `/api/bots/*` - Bot CRUD operations and control (start/stop/restart)
  - `/api/bots/:id/logs` - Real-time log streaming via WebSocket upgrade

### Data Storage Solutions

**Primary Database: PostgreSQL with Drizzle ORM**
- Neon serverless PostgreSQL configured via `@neondatabase/serverless`
- WebSocket constructor configured for serverless environment compatibility
- Schema-first approach with TypeScript types generated from Drizzle schema
- Tables:
  - `sessions` - Session storage for authentication
  - `users` - User profiles with tier system (FREE/PREMIUM) and usage tracking
  - `bots` - Bot configurations, status, and metadata
  - `environment_variables` - Bot-specific environment variables
  - `access_tokens` - Token-based authentication credentials

**Schema Design Patterns**
- UUID primary keys for users (using `gen_random_uuid()`)
- Serial integer IDs for bots, tokens, and environment variables
- Timestamp tracking (`createdAt`, `updatedAt`) for all entities
- String-based enums for status fields (e.g., bot status: 'running'/'stopped'/'error')
- Foreign key relationships with proper indexing
- Zod schemas generated from Drizzle schemas using `drizzle-zod`

**Alternative Storage: MongoDB (Mongoose)**
- MongoDB support maintained as alternative implementation
- Mongoose schemas mirror Drizzle schema structure
- Atomic operations for usage counting
- Compatible with MongoDB Atlas free tier
- Connection string configurable via `MONGODB_URI` or `DATABASE_URL` environment variable

### Authentication and Authorization

**Token-Based Access Control**
- Custom token format: BACK-XXXX
- Token validation on every request via access_tokens table lookup
- Active/inactive token states managed by admin
- Token-to-user mapping for session creation
- Created by admin with optional metadata tracking

**Admin System**
- Separate admin authentication flow via username/password
- Admin credentials enforced via environment variables in production
- Admin-only routes protected by `isAdmin` middleware
- Admin panel supports:
  - User management (tier changes, usage limits, auto-restart settings)
  - Token generation and revocation
  - Usage count modifications

**Session Security**
- HttpOnly cookies to prevent XSS attacks
- Secure flag enabled in production environments
- 7-day session TTL with automatic cleanup
- CSRF protection via trust proxy configuration
- Session data stored in PostgreSQL for scalability

### External Dependencies

**Database Services**
- **Neon PostgreSQL**: Primary database with serverless architecture
  - WebSocket-based connection pooling
  - Configured via `DATABASE_URL` environment variable
  - Free tier available with generous limits
  
- **MongoDB Atlas** (Optional): Alternative database backend
  - Mongoose ODM for schema validation
  - Connection via `MONGODB_URI` environment variable
  - Supports free M0 cluster tier

**Development Tools**
- **Replit Integration**: Optional Replit-specific plugins
  - `@replit/vite-plugin-runtime-error-modal` for error overlay
  - `@replit/vite-plugin-cartographer` for code navigation
  - `@replit/vite-plugin-dev-banner` for development banner
  - OIDC authentication support via `openid-client` and Passport

**Build & Development**
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Backend bundling for production deployment
- **TypeScript**: Type checking without emission (build handled by bundlers)
- **Drizzle Kit**: Database schema migrations and push operations

**UI Component Libraries**
- **Radix UI**: Headless component primitives for 30+ components
- **Lucide React**: Icon library for consistent iconography
- **React Icons**: Additional icons (Python, Node.js, Telegram logos)
- **Tailwind CSS**: Utility-first CSS with PostCSS processing
- **Class Variance Authority**: Component variant management
- **date-fns**: Date formatting and manipulation

**File Handling**
- **Multer**: Multipart form data handling for ZIP uploads
- **Unzipper**: ZIP file extraction for bot code deployment
- **ws (WebSocket)**: Real-time bidirectional communication for logs

**Production Deployment**
- **Render.com**: Primary deployment target with render.yaml configuration
- Environment variable validation enforced in production mode
- Auto-deploy from Git repository
- Build command: `npm install && npm run build`
- Start command: `npm start`