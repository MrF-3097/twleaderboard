# Leaderboard TV Display

A specialized web application designed for displaying the agent leaderboard on TV screens. This application clones the stats and leaderboard components from the Agent Dashboard Minimal project and optimizes them for large-screen display.

## Overview

This project is a standalone Next.js application that focuses solely on displaying the real-time agent leaderboard in a TV-friendly format. It syncs with the main Agent Dashboard via an external API endpoint. It includes:

- Real-time leaderboard with automatic updates every 5 seconds (synced with main dashboard)
- External API integration with ETag cache validation and retry logic
- Gamified agent cards with XP, levels, and rankings
- Stats overview showing total agents, transactions, sales value, and top performer
- Smooth animations and transitions optimized for TV viewing
- Sound effects for rank changes (optional)

## Features

### Leaderboard Display
- **Real-time Updates**: Automatically refreshes every 5 seconds, synced with main dashboard
- **External API Integration**: Fetches data from main Agent Dashboard API endpoint
- **Efficient Polling**: Uses ETag headers for cache validation to reduce bandwidth
- **Error Handling**: Automatic retry with exponential backoff on network failures
- **Gamified Elements**: XP system, levels, and badges
- **Top 3 Highlighting**: Special gold, silver, and bronze styling for top performers
- **Rank Change Indicators**: Visual feedback when agents move up or down
- **Agent Details Modal**: Click any agent card to see detailed statistics

### Stats Overview
- Total Agents count
- Total Transactions count
- Total Sales Value (in millions)
- Top Performer name

### TV Optimizations
- Large, readable fonts
- High contrast colors
- Smooth CSS animations
- Full-screen layout
- Auto-refresh functionality

## Tech Stack

- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **Drizzle ORM**: Database management
- **SQLite**: Local database storage
- **SWR**: Data fetching and caching

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Database**
   ```bash
   npm run db:push
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── agents/          # REBS API integration
│   │   ├── leaderboard-local/  # Leaderboard aggregation
│   │   └── transactions-local/ # Transaction data
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main TV display page
├── components/
│   ├── modules/
│   │   └── leaderboard/
│   │       ├── agent-card.tsx
│   │       ├── agent-detail-modal.tsx
│   │       └── gamified-leaderboard.tsx
│   └── ui/                  # Reusable UI components
├── hooks/
│   ├── use-agent-leaderboard.ts
│   └── use-commissions.ts
├── lib/
│   ├── sounds.ts            # Sound effects
│   └── utils.ts             # Utility functions
├── types/
│   ├── commissions.ts
│   └── index.ts
└── db/
    ├── index.ts
    └── schema.ts
```

## API Integration

### External API (Primary)
The application fetches leaderboard data from the main Agent Dashboard API:

- **Endpoint**: `http://185.92.192.127:3000/api/leaderboard`
- **Method**: GET
- **Polling Interval**: 5 seconds (matches API cache duration)
- **Features**:
  - ETag cache validation for efficient updates
  - Automatic retry with exponential backoff (3 attempts)
  - 10-second timeout per request
  - CORS enabled

**Configuration**: The API URL can be overridden via `NEXT_PUBLIC_LEADERBOARD_API_URL` environment variable.

### Local API Endpoints (Legacy/Fallback)
- `GET /api/leaderboard-local` - Get aggregated leaderboard data (legacy)
- `GET /api/transactions-local` - Get transaction data (legacy)
- `GET /api/agents` - Get agent information from REBS API

## Database

The application uses SQLite for local data storage. The database file is located at `data/database.sqlite`.

### Schema
- `transactions` - Stores transaction records with agent, value, commission, and timestamp

## Configuration

### Environment Variables

- `NEXT_PUBLIC_LEADERBOARD_API_URL` - Override the external leaderboard API URL (default: `http://185.92.192.127:3000/api/leaderboard`)
- `REBS_API_KEY` - REBS CRM API key (optional, defaults to hardcoded key but should be set via environment variable for security)
- `REBS_API_BASE` - REBS CRM API base URL (optional, defaults to `https://towerimob.crmrebs.com/api/public`)

### API Configuration

The application connects to:
1. **External Leaderboard API**: Main dashboard API endpoint (configurable via environment variable)
2. **REBS API**: For agent information (API key and base URL configured in `src/app/api/agents/route.ts`)

## Development Notes

- The application polls the external API for updates every 5 seconds
- Uses ETag headers to efficiently detect when data has changed
- Automatic retry logic handles temporary network failures gracefully
- Sound effects can be toggled on/off
- Debug panel is available in development mode
- Cached data is preserved during network errors for better UX

## Deployment

For TV display deployment:

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Configure the TV browser to auto-refresh or use kiosk mode
4. Set the browser to fullscreen mode

## Project Journey

**Francesco 18.08.2025**: Created specialized TV display webapp by cloning leaderboard components from Agent Dashboard Minimal. Set up complete project structure with Next.js, TypeScript, Tailwind CSS, and all necessary dependencies. Implemented gamified leaderboard with real-time updates, stats overview, and TV-optimized UI. Added smooth animations, sound effects, and agent detail modals. Configured API routes for leaderboard aggregation and REBS integration. Optimized for large-screen display with high contrast and readable fonts.

**Francesco 18.08.2025**: Integrated external leaderboard API integration. Created `use-external-leaderboard` hook with polling (5-second interval), ETag cache validation, and retry logic with exponential backoff. Updated `use-agent-leaderboard` to use external API data instead of local database. Added Zod schemas for API response validation. Updated types to include `total_commission` field. Made API URL configurable via environment variable. Updated polling interval from 30 seconds to 5 seconds to match API cache duration. Maintained smooth animations and rank change detection. The leaderboard now syncs in real-time with the main Agent Dashboard, showing updates within 5 seconds of admin changes.

**Francesco 14.11.2025**: Locked the monthly goal progress bar to a static gold fill (no gradients or animations) with a guaranteed minimum width, ensuring Smart TVs and other restrictive devices always display the progress accurately even at the cost of visual flair.

**Francesco 14.11.2025**: Reintroduced motion by animating the monthly goal progress bar so it fully drains every 30 seconds, pauses empty for two seconds, then refills to the true commission value. Added a repeating minute-based podium flourish where the top three agent cards glide off-screen to the right in order and spring back from the top with staggered inertia, keeping the leaderboard lively during long-running TV sessions.

**Francesco 15.11.2025**: Softened the light-mode experience by switching the global background, card, and popover colors to `#F8F8FF`, matching the TV display’s airy palette while maintaining contrast for stats and leaderboard columns.

