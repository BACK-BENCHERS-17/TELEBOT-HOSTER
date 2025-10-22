import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  Rocket,
  LogOut,
  PlayCircle,
  StopCircle,
  Activity,
  Settings as SettingsIcon,
  Loader2,
  Bot,
  User,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { SiPython, SiNodedotjs } from "react-icons/si";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DeployBotDialog } from "@/components/DeployBotDialog";
import type { Bot as BotType } from "@shared/schema";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);

  const { data: bots = [], isLoading } = useQuery<BotType[]>({
    queryKey: ["/api/bots"],
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-3 w-3 animate-pulse" />;
      case 'deploying':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      default:
        return null;
    }
  };

  const getRuntimeIcon = (runtime: string) => {
    if (runtime === 'python') {
      return <SiPython className="h-5 w-5 text-[#3776ab]" />;
    }
    return <SiNodedotjs className="h-5 w-5 text-[#339933]" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TELEBOT HOSTER</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.email || "User"} />
                    <AvatarFallback>
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.email}
                    </p>
                    {user?.email && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="button-profile">
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">My Bots</h1>
              {user?.tier === 'PREMIUM' ? (
                <Badge className="bg-gradient-to-r from-chart-2 to-primary text-white gap-2" data-testid="badge-premium">
                  <Crown className="h-3 w-3" />
                  PREMIUM
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-free">FREE</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Manage and monitor your deployed Telegram bots
            </p>
            {user?.tier === 'FREE' && (
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-usage-info">
                Usage: <span className="font-medium">{user?.usageCount} / {user?.usageLimit}</span> deployments
                {user.usageCount >= user.usageLimit && (
                  <span className="text-destructive ml-2">(Limit reached)</span>
                )}
              </p>
            )}
          </div>
          <Button 
            size="lg"
            onClick={() => setDeployDialogOpen(true)}
            disabled={user?.tier === 'FREE' && (user?.usageCount || 0) >= (user?.usageLimit || 0)}
            data-testid="button-deploy-bot"
          >
            <Plus className="mr-2 h-5 w-5" />
            Deploy Bot
          </Button>
        </div>

        {/* Usage Limit Warning for FREE users */}
        {user?.tier === 'FREE' && user?.usageCount >= user?.usageLimit && (
          <Card className="p-4 mb-6 bg-destructive/10 border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive mb-1">Deployment Limit Reached</p>
                <p className="text-sm text-muted-foreground">
                  You've used all {user.usageLimit} of your free deployments. Contact the administrator to upgrade to PREMIUM for unlimited deployments.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Upgrade suggestion for FREE users nearing limit */}
        {user?.tier === 'FREE' && user?.usageCount >= (user?.usageLimit || 0) * 0.8 && user?.usageCount < user?.usageLimit && (
          <Card className="p-4 mb-6 bg-chart-2/10 border-chart-2/20">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-chart-2 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-chart-2 mb-1">Running Low on Deployments</p>
                <p className="text-sm text-muted-foreground">
                  You've used {user.usageCount} of {user.usageLimit} deployments. Upgrade to PREMIUM for unlimited deployments and auto-restart service.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Auto-restart info for PREMIUM users */}
        {user?.tier === 'PREMIUM' && user?.autoRestart === 'true' && (
          <Card className="p-4 mb-6 bg-chart-3/10 border-chart-3/20">
            <div className="flex items-start gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-chart-3 shrink-0 mt-0.5">
                <span className="text-xs text-white font-bold">✓</span>
              </div>
              <div>
                <p className="font-medium text-chart-3 mb-1">Auto-Restart Service Active</p>
                <p className="text-sm text-muted-foreground">
                  Your bots will automatically restart if they crash or encounter errors. This is a PREMIUM feature.
                </p>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bots.length === 0 ? (
          // Empty State
          <Card className="p-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Deploy Your First Bot</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your bot's ZIP file and go live in under 60 seconds. 
              We'll handle the infrastructure, you focus on building.
            </p>
            <Button 
              size="lg"
              onClick={() => setDeployDialogOpen(true)}
              data-testid="button-deploy-first-bot"
            >
              <Plus className="mr-2 h-5 w-5" />
              Deploy Your First Bot
            </Button>
          </Card>
        ) : (
          // Bots Grid
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot, index) => (
              <Card key={bot.id || `bot-${index}`} className="p-6 hover-elevate cursor-pointer transition-all" onClick={() => setLocation(`/bot/${bot.id}`)} data-testid={`card-bot-${bot.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {getRuntimeIcon(bot.runtime)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg" data-testid={`text-bot-name-${bot.id}`}>{bot.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{bot.runtime}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <Badge className={`${getStatusColor(bot.status)} gap-1.5`} data-testid={`badge-status-${bot.id}`}>
                    {getStatusIcon(bot.status)}
                    <span className="capitalize">{bot.status}</span>
                  </Badge>
                </div>

                {bot.errorMessage && (
                  <div className="mb-4 rounded-md bg-destructive/10 p-3">
                    <p className="text-xs text-destructive font-mono">{bot.errorMessage}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Created {new Date(bot.createdAt!).toLocaleDateString()}</span>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant={bot.status === 'running' ? 'destructive' : 'default'}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle start/stop
                    }}
                    data-testid={`button-toggle-${bot.id}`}
                  >
                    {bot.status === 'running' ? (
                      <>
                        <StopCircle className="mr-2 h-4 w-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/bot/${bot.id}`);
                    }}
                    data-testid={`button-manage-${bot.id}`}
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <DeployBotDialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen} />
    </div>
  );
}
