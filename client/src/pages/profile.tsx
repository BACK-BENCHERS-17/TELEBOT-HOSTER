import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  User as UserIcon, 
  Mail, 
  Key, 
  Rocket,
  LogOut,
  ChevronLeft,
  Crown
} from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { Footer } from "@/components/Footer";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function ContactInfoQuery() {
  const { data: contactInfo } = useQuery<{ contact: string }>({
    queryKey: ["/api/auth/contact-info"],
  });

  return (
    <a
      href={`https://${contactInfo?.contact || 't.me/BACK_BENCHERS_x17'}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-primary hover-elevate active-elevate-2 px-3 py-1.5 rounded-md bg-background/50 border"
      data-testid="link-contact-premium"
    >
      <MessageCircle className="h-4 w-4" />
      <span>Contact for Premium Upgrade</span>
    </a>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      queryClient.clear();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/";
    }
  };

  const getTierBadge = () => {
    if (user?.tier === 'PREMIUM') {
      return (
        <Badge className="bg-gradient-to-r from-chart-2 to-primary text-white gap-2">
          <Crown className="h-3 w-3" />
          PREMIUM
        </Badge>
      );
    }
    return <Badge variant="secondary">FREE</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TELE HOST</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            View and manage your account information
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle>Account Information</CardTitle>
              {getTierBadge()}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      value={firstName}
                      disabled
                      className="flex-1"
                      data-testid="input-firstname"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      value={lastName}
                      disabled
                      className="flex-1"
                      data-testid="input-lastname"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="flex-1"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                {user?.telegramId && (
                  <>
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-4">
                        <SiTelegram className="h-5 w-5 text-[#0088cc]" />
                        <Label className="text-base font-semibold">Telegram Account</Label>
                      </div>
                      
                      <div className="flex items-start gap-4 p-4 rounded-lg bg-[#0088cc]/5 border border-[#0088cc]/20">
                        <Avatar className="h-16 w-16">
                          {user.telegramPhotoUrl && (
                            <AvatarImage src={user.telegramPhotoUrl} alt={user.telegramFirstName || "User"} />
                          )}
                          <AvatarFallback className="bg-[#0088cc] text-white text-lg">
                            {user.telegramFirstName?.[0] || "T"}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium" data-testid="text-telegram-name">
                              {user.telegramFirstName} {user.telegramLastName || ""}
                            </p>
                          </div>
                          
                          {user.telegramUsername && (
                            <div>
                              <p className="text-sm text-muted-foreground">Username</p>
                              <p className="font-medium" data-testid="text-telegram-username">
                                @{user.telegramUsername}
                              </p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Telegram ID</p>
                            <p className="font-mono text-sm" data-testid="text-telegram-id">
                              {user.telegramId}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  To update your profile information, please contact the administrator.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium mb-1">Account Tier</p>
                    <p className="text-2xl font-bold" data-testid="text-tier">
                      {user?.tier}
                    </p>
                  </div>
                  <Key className="h-8 w-8 text-muted-foreground" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium mb-1">Bot Deployments Used</p>
                    <p className="text-2xl font-bold" data-testid="text-usage">
                      {user?.usageCount} / {user?.tier === 'PREMIUM' ? '∞' : user?.usageLimit}
                    </p>
                    {user?.tier === 'FREE' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Remaining: {(user?.usageLimit || 0) - (user?.usageCount || 0)} deployments
                      </p>
                    )}
                  </div>
                  <Rocket className="h-8 w-8 text-muted-foreground" />
                </div>

                {user?.tier === 'FREE' && (
                  <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                    <div className="flex items-start gap-3">
                      <Crown className="h-5 w-5 text-chart-2 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-chart-2 mb-1">Upgrade to Premium</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Get unlimited bot deployments, auto-restart service, and priority support.
                        </p>
                        <ContactInfoQuery />
                      </div>
                    </div>
                  </div>
                )}

                {user?.autoRestart === 'true' && (
                  <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
                    <div className="flex items-start gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-chart-3 shrink-0 mt-0.5">
                        <span className="text-xs text-white font-bold">✓</span>
                      </div>
                      <div>
                        <p className="font-medium text-chart-3 mb-1">Auto-Restart Enabled</p>
                        <p className="text-sm text-muted-foreground">
                          Your bots will automatically restart if they crash or encounter errors.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-go-dashboard"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
                data-testid="button-logout-profile"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
