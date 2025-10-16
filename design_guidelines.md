# TELEBOT HOSTER - Design Guidelines

## Design Approach

**Hybrid Strategy**: Material Design principles with Pella.app-inspired visual treatment for a modern developer platform aesthetic. The design balances professional functionality with approachable, welcoming visuals that reduce the intimidation factor of bot deployment.

**Reference Inspiration**: Pella.app, Vercel, Railway.app, and Render dashboard aesthetics - clean, modern SaaS platforms with developer-first UX.

**Core Design Principles**:
- Clarity over cleverness: Every interaction should be immediately understandable
- Progressive disclosure: Show complexity only when needed
- Confidence through feedback: Users always know what's happening with their bots
- Speed perception: Visual feedback makes operations feel instant

---

## Color Palette

### Dark Mode (Primary Interface)
**Background Layers**:
- Primary background: 220 20% 8% (deep slate, almost black)
- Surface background: 220 18% 12% (cards, containers)
- Elevated surface: 220 16% 16% (modals, dropdowns)

**Brand & Accent Colors**:
- Primary brand: 260 85% 65% (vibrant purple, for CTAs and key actions)
- Primary hover: 260 85% 72% (lighter purple for hover states)
- Success state: 142 70% 50% (green for running bots)
- Error state: 0 75% 60% (red for failed deployments)
- Warning state: 38 92% 55% (amber for pending operations)

**Text Colors**:
- Primary text: 220 15% 95% (near-white for headlines)
- Secondary text: 220 12% 70% (muted for descriptions)
- Tertiary text: 220 10% 50% (subtle for metadata)

### Light Mode (Optional Secondary)
- Background: 220 20% 98%
- Surface: 0 0% 100%
- Primary brand remains: 260 85% 55% (slightly darker for contrast)

---

## Typography

**Font Families**:
- Primary: 'Inter' (Google Fonts) - All UI text, buttons, forms
- Monospace: 'JetBrains Mono' (Google Fonts) - Code snippets, logs, bot IDs

**Type Scale**:
- Hero headline (landing): text-6xl font-bold (60px)
- Page headline: text-4xl font-bold (36px)
- Section heading: text-2xl font-semibold (24px)
- Card title: text-lg font-medium (18px)
- Body text: text-base font-normal (16px)
- Small text/metadata: text-sm (14px)
- Logs/code: text-sm font-mono (14px monospace)

**Line Heights**: Use relaxed leading (leading-relaxed) for body text, tighter for headings (leading-tight).

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 8, 12, 16** consistently.
- Micro spacing: p-2, gap-2 (within components)
- Component spacing: p-4, gap-4 (buttons, inputs)
- Section spacing: p-8, gap-8 (cards, containers)
- Page layout: p-12, gap-12 (major sections)
- Hero/feature areas: py-16 to py-24 (vertical breathing room)

**Grid System**:
- Dashboard: 12-column grid on desktop (grid-cols-12)
- Cards: 1-column mobile → 2-3 columns desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Form layouts: Single column max-w-2xl centered

**Container Widths**:
- Landing page: max-w-7xl
- Dashboard: max-w-screen-2xl (needs more space for data)
- Forms/modals: max-w-xl

---

## Component Library

### Landing Page Components

**Hero Section** (h-screen or min-h-[600px]):
- Large centered headline with gradient text effect (purple to blue)
- Subheading explaining the 60-second deployment promise
- Single prominent "Login with Google" button (large, px-8 py-4, with Google icon)
- Subtle animated background: soft gradient mesh or gentle particle effect
- Trust indicator below button: "No credit card required • Deploy in seconds"

**Feature Grid** (3 columns on desktop):
- Icon (use Heroicons) + Title + Description cards
- Features: "One-Click Deploy", "Real-time Logs", "Python & Node.js Support", "Environment Variables", "Auto-scaling", "99.9% Uptime"
- Cards with subtle hover elevation (hover:shadow-xl transition)

**How It Works Section** (3-step visual):
- Numbered steps with large icons
- Step 1: "Login with Google" → Step 2: "Upload ZIP" → Step 3: "Bot Live"
- Use connecting lines or arrows between steps

**CTA Section**:
- Repeat login button with secondary text: "Join 1,000+ developers hosting bots"
- Background: subtle gradient overlay

### Authentication

**Login Modal/Page**:
- Centered card (max-w-md)
- TELEBOT HOSTER logo at top
- Single Google login button with icon
- Footer: Privacy Policy and Terms links (text-xs)

### Dashboard Components

**Navigation Bar**:
- Fixed top bar with TELEBOT HOSTER logo (left)
- User avatar with dropdown menu (right): Profile, Settings, Logout
- Background: surface color with subtle bottom border

**Sidebar** (Optional on desktop, hamburger on mobile):
- "My Bots" (active)
- "Deploy New Bot"
- "Billing" (future)
- "Documentation"

**Bot Cards Grid** (Empty State):
- Large centered illustration (use Undraw.co style placeholder)
- Headline: "Deploy Your First Bot"
- Subtext: "Upload your bot ZIP and go live in under 60 seconds"
- Primary CTA: Large "Deploy Bot" button

**Bot Cards Grid** (With Bots):
- Each card shows:
  - Bot name (text-lg font-semibold)
  - Status badge (pill-shaped, colored by state: green/red/amber)
  - Runtime icon (Python/Node.js logo)
  - Resource metrics: CPU/RAM bars (small progress indicators)
  - Created date (text-xs text-muted)
  - Action buttons: "View", "Stop/Start", "Settings" (icon buttons)
- Card design: rounded-xl border with hover:border-purple transition

### Deployment Flow

**Upload Modal** (max-w-2xl):
- Step indicator at top (1. Upload → 2. Configure → 3. Deploy)
- **Step 1**: Drag-and-drop zone with dashed border, cloud upload icon
  - "Drop your ZIP here or click to browse"
  - File preview once uploaded (show filename, size)
- **Step 2**: Form fields:
  - Bot Name (text input)
  - Runtime (dropdown: Python 3.11 / Node.js 18)
  - Environment Variables (key-value pair inputs with "+ Add" button)
  - Collapsible "Advanced Settings" (optional later)
- **Step 3**: Review summary before deploy
- Footer: "Cancel" (ghost button) + "Deploy Bot" (primary button)

### Bot Management Page

**Header**:
- Bot name (large, editable inline)
- Status indicator (large badge with pulsing dot for "Running")
- Action buttons row: "Restart", "Stop", "Delete" (with confirmation)

**Stats Cards Row** (4 cards):
- Uptime, CPU Usage, Memory Usage, Requests/min
- Each card: icon + metric + small sparkline chart

**Live Logs Panel**:
- Terminal-style interface with dark background (bg-slate-900)
- Monospace font
- Auto-scroll to bottom
- Color-coded log levels: INFO (blue), WARN (amber), ERROR (red)
- Search/filter bar above logs
- "Clear Logs" and "Download Logs" buttons

**Environment Variables Panel**:
- Table layout: Key | Value (masked) | Actions
- "+ Add Variable" button
- Edit/Delete icons for each variable
- "Save Changes" button (appears when edited)

### Forms & Inputs

**Text Inputs**:
- Consistent height (h-12)
- Rounded corners (rounded-lg)
- Dark background with lighter border
- Focus state: border-purple ring-2 ring-purple/20
- Labels above inputs (text-sm font-medium)

**Buttons**:
- Primary: bg-purple text-white px-6 py-3 rounded-lg font-medium
- Secondary: border border-slate-600 text-slate-200 px-6 py-3 rounded-lg
- Ghost: text-purple hover:bg-purple/10 px-4 py-2 rounded-lg
- Icon buttons: p-2 rounded-lg hover:bg-slate-800

**Dropdowns**:
- Match text input styling
- Dropdown menu: elevated surface with subtle shadow
- Selected item: bg-purple/10 text-purple

---

## Animations & Interactions

**Micro-interactions** (use sparingly):
- Button hover: subtle scale (hover:scale-105) on primary CTAs only
- Card hover: elevation change (shadow transition)
- Loading states: spinner for async operations
- Success checkmark animation on deployment complete
- Progress bars for upload/deployment

**Page Transitions**:
- Subtle fade (no flashy animations)
- Modal enter/exit: scale + fade

**Status Indicators**:
- Running bots: pulsing green dot (animate-pulse)
- Deploying: rotating spinner
- Error: static red dot

---

## Images

**Hero Section**: 
Use a modern, abstract 3D illustration of servers/bots communicating (pastel purple/blue gradient style, similar to Vercel/Railway marketing). Alternative: Animated gradient mesh background (no image needed).

**Empty States**:
Use friendly illustrations (Undraw.co or Storyset style) showing:
- Empty dashboard: Person uploading file to cloud
- No logs yet: Terminal with checkmark
- Error state: Person with wrench fixing server

**Bot Status Icons**:
Use consistent icon library (Heroicons) for Python logo, Node.js logo, status indicators.

---

## Responsive Behavior

**Mobile** (< 768px):
- Single column layouts
- Hamburger navigation
- Simplified bot cards (stack information vertically)
- Bottom sheet for modals instead of centered
- Touch-friendly button sizes (min 44px height)

**Tablet** (768px - 1024px):
- 2-column bot grid
- Side navigation collapses to icons only

**Desktop** (> 1024px):
- Full 3-column bot grid
- Persistent sidebar
- Richer data tables and charts