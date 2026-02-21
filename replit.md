# Auren League - Football League Management System

## Overview

Auren League is a Turkish-language football league management web application. It allows users to view league standings, fixtures, player statistics, and participate in an anonymous chat room. The admin (Kralbaba12) can manage teams, players, matches, and moderate the chat system including banning users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state with polling-based updates
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Theming**: next-themes for dark/light mode toggle
- **Fonts**: Outfit (display) and Inter (body) via Google Fonts

The frontend follows a page-based structure with custom hooks for data fetching (`use-teams`, `use-players`, `use-matches`, `use-chat`, `use-auth`). Each hook encapsulates API calls and mutations using React Query.

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Server**: Node.js with HTTP server
- **Session Management**: express-session with MemoryStore for development
- **Build**: esbuild for server bundling, Vite for client bundling

The backend uses a storage abstraction pattern (`IStorage` interface) implemented by `DatabaseStorage` class, making it easier to swap data sources if needed.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` - contains tables for teams, players, matches, messages, and banned users
- **Migrations**: Drizzle Kit with migrations output to `./migrations`

Key tables:
- `teams`: League standings with cached statistics (points, goals, wins, etc.)
- `players`: Individual player stats (goals, assists, cards, clean sheets)
- `matches`: Fixture data with scores, week numbers, and video URLs
- `messages`: Chat messages with anonymous sender tracking
- `bannedUsers`: User ban list for chat moderation

### Authentication
- Session-based authentication stored in memory
- Single admin user with hardcoded credentials (username: Kralbaba12)
- Anonymous users get assigned sequential IDs for chat identification
- Admin-only routes protected via session checks

### API Design
- RESTful API defined in `shared/routes.ts` using Zod schemas for type safety
- API contract pattern with input/output validation
- Endpoints for CRUD operations on teams, players, matches, and chat messages
- Ban system integrated into chat functionality

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: PostgreSQL session store (available but using MemoryStore in dev)

### UI Components
- **Radix UI**: Headless UI primitives (dialogs, dropdowns, tabs, etc.)
- **shadcn/ui**: Pre-styled component library built on Radix
- **Lucide React**: Icon library
- **date-fns**: Date formatting with Turkish locale support
- **embla-carousel-react**: Carousel functionality

### Build & Development
- **Vite**: Frontend development server and bundler
- **esbuild**: Server-side bundling for production
- **Replit plugins**: Runtime error overlay, cartographer, dev banner for Replit environment