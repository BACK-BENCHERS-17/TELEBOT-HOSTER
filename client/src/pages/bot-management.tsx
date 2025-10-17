import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  PlayCircle,
  StopCircle,
  RotateCw,
  Trash2,
  Loader2,
  Activity,
  Plus,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { SiPython, SiNodedotjs } from "react-icons/si";
import type { Bot as BotType, EnvironmentVariable } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function BotManagement() {
  const params = useParams();
  const botId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([]);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});

  const { data: bot, isLoading } = useQuery<BotType>({
    queryKey: ['/api/bots', botId],
    enabled: !!botId,
  });

  const { data: envVarsData = [] } = useQuery<EnvironmentVariable[]>({
    queryKey: ['/api/bots', botId, 'env'],
    enabled: !!botId,
  });

  useEffect(() => {
    setEnvVars(envVarsData);
  }, [envVarsData]);

  // WebSocket for real-time logs
  useEffect(() => {
    if (!botId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'subscribe', botId }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log' && data.botId === botId) {
        setLogs(prev => [...prev, data.message]);
      }
    };

    return () => {
      socket.close();
    };
  }, [botId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const startMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/bots/${botId}/start`),
    onSuccess: () => {
      toast({ title: "Bot started successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId] });
    },
    onError: () => {
      toast({ title: "Failed to start bot", variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/bots/${botId}/stop`),
    onSuccess: () => {
      toast({ title: "Bot stopped successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId] });
    },
    onError: () => {
      toast({ title: "Failed to stop bot", variant: "destructive" });
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/bots/${botId}/restart`),
    onSuccess: () => {
      toast({ title: "Bot restarted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId] });
    },
    onError: () => {
      toast({ title: "Failed to restart bot", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/bots/${botId}`),
    onSuccess: () => {
      toast({ title: "Bot deleted successfully" });
      setLocation('/');
    },
    onError: () => {
      toast({ title: "Failed to delete bot", variant: "destructive" });
    },
  });

  const addEnvVarMutation = useMutation({
    mutationFn: () => 
      apiRequest('POST', `/api/bots/${botId}/env`, { key: newEnvKey, value: newEnvValue }),
    onSuccess: () => {
      toast({ title: "Environment variable added" });
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId, 'env'] });
      setNewEnvKey("");
      setNewEnvValue("");
    },
    onError: () => {
      toast({ title: "Failed to add environment variable", variant: "destructive" });
    },
  });

  const deleteEnvVarMutation = useMutation({
    mutationFn: (envId: number) => apiRequest('DELETE', `/api/bots/${botId}/env/${envId}`),
    onSuccess: () => {
      toast({ title: "Environment variable deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId, 'env'] });
    },
    onError: () => {
      toast({ title: "Failed to delete environment variable", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Bot Not Found</h2>
          <Button onClick={() => setLocation('/')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-chart-3 text-white';
      case 'stopped':
        return 'bg-muted text-muted-foreground';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'deploying':
        return 'bg-chart-4 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRuntimeIcon = (runtime: string) => {
    if (runtime === 'python') {
      return <SiPython className="h-6 w-6 text-[#3776ab]" />;
    }
    return <SiNodedotjs className="h-6 w-6 text-[#339933]" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                {getRuntimeIcon(bot.runtime)}
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-bot-name">{bot.name}</h1>
                <p className="text-sm text-muted-foreground capitalize">{bot.runtime}</p>
              </div>
            </div>
            <Badge className={getStatusColor(bot.status)} data-testid="badge-bot-status">
              {bot.status === 'running' && <Activity className="mr-1.5 h-3 w-3 animate-pulse" />}
              <span className="capitalize">{bot.status}</span>
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Control Buttons */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Bot Controls</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => startMutation.mutate()}
              disabled={bot.status === 'running' || startMutation.isPending}
              data-testid="button-start-bot"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Start
            </Button>
            <Button
              variant="destructive"
              onClick={() => stopMutation.mutate()}
              disabled={bot.status === 'stopped' || stopMutation.isPending}
              data-testid="button-stop-bot"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Stop
            </Button>
            <Button
              variant="outline"
              onClick={() => restartMutation.mutate()}
              disabled={restartMutation.isPending}
              data-testid="button-restart-bot"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Restart
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive" data-testid="button-delete-bot">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Bot
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your bot and all its data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>

        {/* Live Logs */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Live Logs</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLogs([])}
              data-testid="button-clear-logs"
            >
              Clear Logs
            </Button>
          </div>
          <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm" data-testid="logs-container">
            {logs.length === 0 ? (
              <p className="text-slate-500">No logs yet. Logs will appear here when your bot is running.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-slate-300 py-0.5" data-testid={`log-line-${i}`}>
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </Card>

        {/* Environment Variables */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
          
          {/* Add New Variable */}
          <div className="mb-6 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-env-key">Key</Label>
                <Input
                  id="new-env-key"
                  placeholder="TELEGRAM_BOT_TOKEN"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  data-testid="input-new-env-key"
                />
              </div>
              <div>
                <Label htmlFor="new-env-value">Value</Label>
                <Input
                  id="new-env-value"
                  type="password"
                  placeholder="your-token-here"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  data-testid="input-new-env-value"
                />
              </div>
            </div>
            <Button
              onClick={() => addEnvVarMutation.mutate()}
              disabled={!newEnvKey || !newEnvValue || addEnvVarMutation.isPending}
              data-testid="button-add-env"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Variable
            </Button>
          </div>

          {/* Existing Variables */}
          <div className="space-y-3">
            {envVars.length === 0 ? (
              <p className="text-sm text-muted-foreground">No environment variables configured.</p>
            ) : (
              envVars.map((envVar) => (
                <div key={envVar.id} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`env-var-${envVar.id}`}>
                  <div className="flex-1">
                    <p className="font-medium font-mono text-sm" data-testid={`env-key-${envVar.id}`}>{envVar.key}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {showValues[envVar.id] ? envVar.value : '••••••••'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowValues(prev => ({ ...prev, [envVar.id]: !prev[envVar.id] }))}
                    data-testid={`button-toggle-visibility-${envVar.id}`}
                  >
                    {showValues[envVar.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteEnvVarMutation.mutate(envVar.id)}
                    data-testid={`button-delete-env-${envVar.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
