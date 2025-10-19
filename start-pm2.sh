#!/bin/bash
# Start the application with PM2 for auto-restart capabilities

echo "Starting application with PM2..."

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Stop any existing PM2 processes
pm2 delete telebot-hoster 2>/dev/null || true

# Start the application
pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
pm2 save

# Display status
pm2 status

echo ""
echo "✓ Application started with PM2"
echo "✓ Auto-restart enabled"
echo ""
echo "Useful commands:"
echo "  pm2 status           - Check application status"
echo "  pm2 logs             - View logs"
echo "  pm2 restart all      - Restart application"
echo "  pm2 stop all         - Stop application"
echo "  npm run logs:pm2     - View application logs"
