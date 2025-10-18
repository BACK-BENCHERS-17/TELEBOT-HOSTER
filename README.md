# TELEBOT HOSTER

A modern platform for deploying and managing Telegram bots with ease. Upload your Python or Node.js bot code, deploy instantly, and monitor with real-time logs.

## Features

- **One-Click Deployment**: Upload a ZIP file containing your bot code and deploy instantly
- **Real-time Logs**: Monitor bot activity with live log streaming via WebSockets
- **Multi-language Support**: Supports Python and Node.js bots
- **Secure Environment**: Bot tokens and secrets are encrypted and stored securely
- **Tiered User System**: FREE and PREMIUM tiers with different deployment limits
- **Token-Based Authentication**: Secure access using BACK-XXXX format tokens
- **Admin Panel**: Manage users and access tokens
- **Bot Management**: 
  - Start/Stop/Restart bots
  - View real-time logs
  - Manage environment variables
  - File system access
  - Package management

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Shadcn/UI components
- TanStack Query for data fetching
- Wouter for routing
- WebSocket for real-time logs

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Express Session for authentication
- WebSocket (ws) for real-time communication
- Multer for file uploads

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Git

### Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd telebot-hoster
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your-mongodb-connection-string
SESSION_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
DEVELOPER_CONTACT=t.me/your_username
```

5. Start the development server:
```bash
npm run dev
```

6. Open your browser to `http://localhost:5000`

## Deployment

### Deploy to Render

See the comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) guide for step-by-step instructions on deploying to Render.com.

Quick steps:
1. Push code to Git repository
2. Create a new Web Service on Render
3. Connect your repository
4. Set environment variables
5. Deploy!

### Environment Variables

Required environment variables:
- `NODE_ENV` - Set to `production` for production builds
- `PORT` - Port to run the server (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `SESSION_SECRET` - Secret key for session encryption
- `ADMIN_USERNAME` - Admin panel username
- `ADMIN_PASSWORD` - Admin panel password

Optional:
- `DEVELOPER_CONTACT` - Contact information displayed on landing page

## Usage

### Admin Panel

1. Navigate to `/admin`
2. Log in with your admin credentials
3. Create access tokens for users
4. Manage user accounts and permissions

### User Access

1. Receive an access token from admin (format: `BACK-XXXX`)
2. Navigate to `/token-login`
3. Enter your token
4. Access the dashboard to deploy and manage bots

### Deploying a Bot

1. Prepare your bot code as a ZIP file
2. Ensure you have a `requirements.txt` (Python) or `package.json` (Node.js)
3. Click "Deploy New Bot" in the dashboard
4. Upload your ZIP file
5. Configure environment variables
6. Set the entry point (e.g., `main.py` or `index.js`)
7. Click Deploy

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
│   └── index.html
├── server/                 # Backend Express application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes and WebSocket
│   ├── storage.ts         # Storage interface
│   ├── mongoStorage.ts    # MongoDB implementation
│   ├── tokenAuth.ts       # Authentication middleware
│   └── adminConfig.ts     # Admin configuration
├── shared/                 # Shared types and schemas
│   └── schema.ts
├── uploads/               # Bot file uploads (git-ignored)
├── dist/                  # Production build output
├── render.yaml            # Render deployment configuration
├── .env.example           # Environment variables template
└── DEPLOYMENT.md          # Deployment guide
```

## Build

```bash
# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues or questions, contact: [Your Contact Info]

---

Built with ❤️ for developers who ship fast
