import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";

export default function AlivePage() {
  const [aliveUrl, setAliveUrl] = useState<string>("");
  const [apiAliveUrl, setApiAliveUrl] = useState<string>("");
  const [status, setStatus] = useState<{ status: string; timestamp: string; uptime: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const baseUrl = window.location.origin;
    setAliveUrl(`${baseUrl}/api/alive`);
    setApiAliveUrl(`${baseUrl}/api/alive`);

    fetch('/api/alive')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error('Failed to fetch status:', err));
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Server Status</h1>
          <p className="text-muted-foreground">Keep your application running 24/7 with uptime monitoring</p>
        </div>

        {status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Server is Online
              </CardTitle>
              <CardDescription>
                Uptime: {formatUptime(status.uptime)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Last checked: {new Date(status.timestamp).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Alive Endpoint</CardTitle>
            <CardDescription>
              Use this URL with uptime monitoring services like UptimeRobot, Cron-job.org, or similar services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monitoring URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={aliveUrl}
                  className="flex-1 px-3 py-2 rounded-md border bg-muted/50 text-sm font-mono"
                  data-testid="input-alive-url"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(aliveUrl, "URL")}
                  data-testid="button-copy-alive-url"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.open(aliveUrl, '_blank')}
                  data-testid="button-open-alive-url"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🚀 Deploy for 24/7 Uptime (Recommended)</CardTitle>
            <CardDescription>
              Deploy your app to Replit's Reserved VM for guaranteed 24/7 uptime with auto-restart
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600 dark:text-green-400">Step 1: Publish on Replit</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-2">
                <li>Click the "Publish" button in the top-right corner</li>
                <li>Select "Reserved VM" deployment type</li>
                <li>Choose your CPU/RAM configuration</li>
                <li>Click "Publish" - Your app will run 24/7!</li>
              </ol>
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Always-on server with dedicated resources<br />
                  ✓ Automatic restarts if app crashes<br />
                  ✓ Custom domain support<br />
                  ✓ Production-ready infrastructure
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔄 Auto-Restart with PM2 (Advanced)</CardTitle>
            <CardDescription>
              Use PM2 process manager for automatic restart on failures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Using PM2 in Replit Shell</h3>
              <div className="bg-muted p-3 rounded-md space-y-2">
                <p className="text-sm text-muted-foreground mb-2">Run these commands in the Replit Shell:</p>
                <code className="block text-xs bg-background p-2 rounded border">./start-pm2.sh</code>
                <p className="text-xs text-muted-foreground mt-2">This will start your app with PM2 and enable auto-restart</p>
              </div>
              
              <h3 className="font-semibold mt-4">PM2 Commands</h3>
              <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded-md">
                <div><span className="text-green-600 dark:text-green-400">pm2 status</span> - Check app status</div>
                <div><span className="text-green-600 dark:text-green-400">pm2 logs</span> - View real-time logs</div>
                <div><span className="text-green-600 dark:text-green-400">pm2 restart all</span> - Restart app</div>
                <div><span className="text-green-600 dark:text-green-400">pm2 stop all</span> - Stop app</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>⏰ External Monitoring (Free Tier)</CardTitle>
            <CardDescription>
              Use free uptime monitors to keep your Replit app alive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">UptimeRobot (Free)</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to <a href="https://uptimerobot.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">uptimerobot.com</a></li>
                <li>Create a new monitor with type "HTTP(s)"</li>
                <li>Paste the monitoring URL from above</li>
                <li>Set interval to 5 minutes (free tier)</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Cron-job.org (Free)</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">cron-job.org</a></li>
                <li>Create a new cron job</li>
                <li>Paste the monitoring URL from above</li>
                <li>Schedule: */5 * * * * (every 5 minutes)</li>
              </ol>
            </div>

            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-md border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Note: Free monitoring services may not guarantee 100% uptime. For production apps, use Reserved VM deployment.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Response Format</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "status": "alive",
  "timestamp": "2025-10-19T12:00:00.000Z",
  "uptime": 3600,
  "message": "Server is running"
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
