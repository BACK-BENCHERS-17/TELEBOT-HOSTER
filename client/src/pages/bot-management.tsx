import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Copy,
  CheckCircle2,
  FolderOpen,
  FileText,
  Upload,
  Edit,
  X,
  Download,
  Info,
} from "lucide-react";
import { SiPython, SiNodedotjs } from "react-icons/si";
import type { Bot as BotType, EnvironmentVariable } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Footer } from "@/components/Footer";

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
}

export default function BotManagement() {
  const params = useParams();
  const botId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [cpuData, setCpuData] = useState<Array<{ time: string; cpu: number; memory: number }>>([]);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});
  const [botName, setBotName] = useState("");
  const [botDescription, setBotDescription] = useState("");
  const [botEntryPoint, setBotEntryPoint] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [newPackage, setNewPackage] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [consoleInput, setConsoleInput] = useState("");

  const isValidBotId = Boolean(botId && botId !== 'null' && botId !== 'undefined');

  const { data: bot, isLoading } = useQuery<BotType>({
    queryKey: ['/api/bots', botId],
    enabled: isValidBotId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'installing' || status === 'starting') {
        return 2000;
      }
      return false;
    },
  });

  const { data: envVars = [] } = useQuery<EnvironmentVariable[]>({
    queryKey: ['/api/bots', botId, 'env'],
    enabled: isValidBotId,
  });

  const { data: packages = [] } = useQuery<string[]>({
    queryKey: ['/api/bots', botId, 'packages'],
    enabled: isValidBotId,
  });

  useEffect(() => {
    if (bot) {
      setBotName(bot.name || "");
      setBotDescription(bot.description || "");
      setBotEntryPoint(bot.entryPoint || "");
    }
  }, [bot]);

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

  useEffect(() => {
    if (!isValidBotId || !bot || bot.status !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/bots/${botId}/stats`);
        const stats = await response.json();
        
        const now = new Date().toLocaleTimeString();
        setCpuData(prev => {
          const newData = [...prev, {
            time: now,
            cpu: stats.cpu || 0,
            memory: (stats.memory || 0) / (1024 * 1024)
          }];
          return newData.slice(-20);
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [botId, isValidBotId, bot?.status]);

  const loadFiles = async (path: string = "") => {
    try {
      const response = await fetch(`/api/bots/${botId}/files?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      setFiles(data);
      setCurrentPath(path);
    } catch (error) {
      toast({ title: "Failed to load files", variant: "destructive" });
    }
  };

  const loadFileContent = async (path: string) => {
    try {
      const response = await fetch(`/api/bots/${botId}/files/content?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      setFileContent(data.content);
      setSelectedFile(path);
    } catch (error) {
      toast({ title: "Failed to load file content", variant: "destructive" });
    }
  };

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
      setCpuData([]);
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
      setLogs([]);
      setCpuData([]);
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

  const updateSettingsMutation = useMutation({
    mutationFn: () => 
      apiRequest('PATCH', `/api/bots/${botId}/settings`, { 
        name: botName, 
        description: botDescription, 
        entryPoint: botEntryPoint 
      }),
    onSuccess: () => {
      toast({ title: "Settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId] });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
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

  const addPackageMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/bots/${botId}/packages`, { packageName: newPackage }),
    onSuccess: () => {
      toast({ title: "Package added successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId, 'packages'] });
      setNewPackage("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to add package", description: error.message, variant: "destructive" });
    },
  });

  const removePackageMutation = useMutation({
    mutationFn: (packageName: string) => 
      apiRequest('DELETE', `/api/bots/${botId}/packages/${encodeURIComponent(packageName)}`),
    onSuccess: () => {
      toast({ title: "Package removed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId, 'packages'] });
    },
    onError: () => {
      toast({ title: "Failed to remove package", variant: "destructive" });
    },
  });

  const createFileMutation = useMutation({
    mutationFn: ({ path, content, type }: { path: string; content?: string; type: 'file' | 'directory' }) =>
      apiRequest('POST', `/api/bots/${botId}/files`, { path, content, type }),
    onSuccess: () => {
      toast({ title: "Created successfully" });
      loadFiles(currentPath);
      setNewFileName("");
      setNewFolderName("");
    },
    onError: () => {
      toast({ title: "Failed to create", variant: "destructive" });
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      apiRequest('POST', `/api/bots/${botId}/files`, { path, content, type: 'file' }),
    onSuccess: () => {
      toast({ title: "File saved successfully" });
      setEditingFile(null);
    },
    onError: () => {
      toast({ title: "Failed to save file", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (path: string) => apiRequest('DELETE', `/api/bots/${botId}/files?path=${encodeURIComponent(path)}`),
    onSuccess: () => {
      toast({ title: "Deleted successfully" });
      loadFiles(currentPath);
      setSelectedFile(null);
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const sendInputMutation = useMutation({
    mutationFn: (input: string) => apiRequest('POST', `/api/bots/${botId}/input`, { input }),
    onSuccess: () => {
      setConsoleInput("");
    },
    onError: () => {
      toast({ title: "Failed to send input", variant: "destructive" });
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    toast({ title: "Logs copied to clipboard" });
  };

  const downloadBotFiles = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bot?.name || 'bot'}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Download started" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleSendInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (consoleInput.trim() && bot?.status === 'running') {
      sendInputMutation.mutate(consoleInput);
    }
  };

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
      case 'starting':
        return 'bg-chart-4 text-white';
      case 'stopping':
        return 'bg-chart-5 text-white';
      case 'installing':
        return 'bg-chart-1 text-white';
      case 'stopped':
        return 'bg-muted text-muted-foreground';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
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
              {bot.status === 'installing' && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              <span className="capitalize">{bot.status}</span>
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-list">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="manage" data-testid="tab-manage">Manage</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
            <TabsTrigger value="files" data-testid="tab-files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bot Status</CardTitle>
                <CardDescription>Current status and resource information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-2xl font-bold capitalize">{bot.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Server ID</p>
                    <p className="text-lg font-mono">{bot.id}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => startMutation.mutate()}
                    disabled={bot.status === 'running' || bot.status === 'installing' || bot.status === 'starting' || startMutation.isPending}
                    data-testid="button-start-bot"
                  >
                    {startMutation.isPending || bot.status === 'installing' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-2 h-4 w-4" />
                    )}
                    {bot.status === 'installing' ? 'Installing...' : 'Start'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => stopMutation.mutate()}
                    disabled={bot.status === 'stopped' || bot.status === 'installing' || stopMutation.isPending}
                    data-testid="button-stop-bot"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => restartMutation.mutate()}
                    disabled={bot.status === 'installing' || restartMutation.isPending}
                    data-testid="button-restart-bot"
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    Restart
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadBotFiles}
                    data-testid="button-download-files"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download ZIP
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Resource Limits</p>
                      <p className="text-sm text-muted-foreground">
                        You are on the Free Tier. Your bot will run for a maximum of 720 hours per month.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Live Console</CardTitle>
                    <CardDescription>Real-time bot logs</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyToClipboard}
                      data-testid="button-copy-logs"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLogs([])}
                      data-testid="button-clear-logs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
                
                {bot.status === 'running' && (
                  <form onSubmit={handleSendInput} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Type a command and press Enter..."
                      value={consoleInput}
                      onChange={(e) => setConsoleInput(e.target.value)}
                      className="bg-slate-900 dark:bg-slate-950 text-slate-300 border-slate-700 font-mono"
                      data-testid="input-console"
                      disabled={sendInputMutation.isPending}
                    />
                    <Button 
                      type="submit" 
                      disabled={!consoleInput.trim() || sendInputMutation.isPending}
                      data-testid="button-send-input"
                    >
                      {sendInputMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resource Monitoring</CardTitle>
                <CardDescription>Live CPU and RAM usage</CardDescription>
              </CardHeader>
              <CardContent>
                {bot.status === 'running' ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium mb-2">CPU Usage (%)</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={cpuData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="cpu" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Memory Usage (MB)</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={cpuData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="memory" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Start your bot to see resource monitoring</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Package Management</CardTitle>
                <CardDescription>Manage bot dependencies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder={bot.runtime === 'python' ? "e.g., requests" : "e.g., express"}
                    value={newPackage}
                    onChange={(e) => setNewPackage(e.target.value)}
                    data-testid="input-package-name"
                  />
                  <Button
                    onClick={() => addPackageMutation.mutate()}
                    disabled={!newPackage || addPackageMutation.isPending}
                    data-testid="button-add-package"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Installed Packages</p>
                  {packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No packages installed</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {packages.map((pkg, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-2" data-testid={`package-${idx}`}>
                          {pkg}
                          <button
                            onClick={() => removePackageMutation.mutate(pkg)}
                            className="hover:text-destructive"
                            data-testid={`button-remove-package-${idx}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bot Configuration</CardTitle>
                <CardDescription>Update your bot settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bot-name">Name</Label>
                  <Input
                    id="bot-name"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    data-testid="input-bot-name"
                  />
                </div>

                <div>
                  <Label htmlFor="bot-description">Description (Optional)</Label>
                  <Textarea
                    id="bot-description"
                    value={botDescription}
                    onChange={(e) => setBotDescription(e.target.value)}
                    placeholder="Describe what your bot does..."
                    rows={3}
                    data-testid="input-bot-description"
                  />
                </div>

                <div>
                  <Label htmlFor="bot-entry-point">Main File (Entry Point)</Label>
                  <Input
                    id="bot-entry-point"
                    value={botEntryPoint}
                    onChange={(e) => setBotEntryPoint(e.target.value)}
                    placeholder={bot.runtime === 'python' ? "main.py" : "index.js"}
                    data-testid="input-bot-entry-point"
                  />
                </div>

                <div>
                  <Label>Server ID (Read-only)</Label>
                  <Input value={bot.id} disabled />
                </div>

                <Button
                  onClick={() => updateSettingsMutation.mutate()}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>Manage secrets and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="space-y-3 pt-4">
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
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" data-testid="button-delete-bot">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Bot
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your bot and all its data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="confirm-name">Type the bot name to confirm: <strong>{bot.name}</strong></Label>
                      <Input
                        id="confirm-name"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder={bot.name}
                        data-testid="input-delete-confirm"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteConfirmName !== bot.name}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>File Manager</CardTitle>
                    <CardDescription>Browse and edit your bot files</CardDescription>
                  </div>
                  <Button onClick={() => loadFiles("")} size="sm" data-testid="button-load-files">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" data-testid="button-new-file">
                            <Plus className="mr-2 h-4 w-4" />
                            New File
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New File</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>File Name</Label>
                              <Input
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                placeholder="example.py"
                                data-testid="input-new-file-name"
                              />
                            </div>
                            <Button
                              onClick={() => {
                                const fullPath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
                                createFileMutation.mutate({ path: fullPath, content: "", type: 'file' });
                              }}
                              disabled={!newFileName}
                              data-testid="button-create-file"
                            >
                              Create
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" data-testid="button-new-folder">
                            <FolderOpen className="mr-2 h-4 w-4" />
                            New Folder
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Folder</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Folder Name</Label>
                              <Input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="my-folder"
                                data-testid="input-new-folder-name"
                              />
                            </div>
                            <Button
                              onClick={() => {
                                const fullPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
                                createFileMutation.mutate({ path: fullPath, type: 'directory' });
                              }}
                              disabled={!newFolderName}
                              data-testid="button-create-folder"
                            >
                              Create
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {currentPath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const parentPath = currentPath.split('/').slice(0, -1).join('/');
                          loadFiles(parentPath);
                        }}
                        data-testid="button-parent-directory"
                      >
                        .. (Parent Directory)
                      </Button>
                    )}

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 border rounded-lg hover-elevate"
                          data-testid={`file-item-${idx}`}
                        >
                          <button
                            className="flex items-center gap-2 flex-1 text-left"
                            onClick={() => {
                              const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
                              if (file.type === 'directory') {
                                loadFiles(fullPath);
                              } else {
                                loadFileContent(fullPath);
                              }
                            }}
                          >
                            {file.type === 'directory' ? (
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{file.name}</span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
                              deleteFileMutation.mutate(fullPath);
                            }}
                            data-testid={`button-delete-file-${idx}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium font-mono">{selectedFile}</p>
                          {editingFile ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateFileMutation.mutate({ path: selectedFile, content: fileContent });
                                }}
                                data-testid="button-save-file"
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingFile(null)}
                                data-testid="button-cancel-edit"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingFile(selectedFile)}
                              data-testid="button-edit-file"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <Textarea
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          className="font-mono text-sm h-96"
                          readOnly={!editingFile}
                          data-testid="textarea-file-content"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-96 text-muted-foreground border rounded-lg">
                        <p>Select a file to view or edit</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      <Dialog open={bot.status === 'installing'}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-installing">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Installing Dependencies
            </DialogTitle>
            <DialogDescription>
              Please wait while we install the required packages from requirements.txt...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary" data-testid="spinner-installing" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Setting up your bot environment</p>
              <p className="text-xs text-muted-foreground">This may take a few moments</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
