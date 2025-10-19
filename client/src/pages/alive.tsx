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
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">UptimeRobot</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to <a href="https://uptimerobot.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">uptimerobot.com</a></li>
                <li>Create a new monitor with type "HTTP(s)"</li>
                <li>Paste the URL above</li>
                <li>Set monitoring interval (recommended: 5 minutes)</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Cron-job.org</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">cron-job.org</a></li>
                <li>Create a new cron job</li>
                <li>Paste the URL above</li>
                <li>Set schedule (recommended: */5 * * * * for every 5 minutes)</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Response Format</h3>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "status": "alive",
  "timestamp": "2025-10-19T12:00:00.000Z",
  "uptime": 3600,
  "message": "Server is running"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
