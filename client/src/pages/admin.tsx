import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, Users, Key, Copy, Trash2, Plus, LogOut, Edit, Download, Upload, Github } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";

export default function AdminPanel() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserTier, setNewUserTier] = useState("FREE");
  const [newUserUsageLimit, setNewUserUsageLimit] = useState("5");
  const [newUserAutoRestart, setNewUserAutoRestart] = useState(false);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState("");
  const [editUsageLimit, setEditUsageLimit] = useState("");
  const [editAutoRestart, setEditAutoRestart] = useState(false);
  const [editUsageCount, setEditUsageCount] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubToken, setGithubToken] = useState("");
  const [githubCommitMessage, setGithubCommitMessage] = useState("");

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/auth/admin-check"],
  });

  const { data: users, refetch: refetchUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminCheck?.isAdmin || isLoggedIn,
  });

  const { data: tokens, refetch: refetchTokens } = useQuery<any[]>({
    queryKey: ["/api/admin/tokens"],
    enabled: adminCheck?.isAdmin || isLoggedIn,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/admin-login", credentials);
      return res.json();
    },
    onSuccess: () => {
      setIsLoggedIn(true);
      toast({ title: "Login successful" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/admin-check"] });
    },
    onError: () => {
      toast({ title: "Invalid credentials", variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      setIsLoggedIn(false);
      setLocation("/");
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: { 
      email: string; 
      firstName: string; 
      lastName: string; 
      tier: string;
      usageLimit: number;
      autoRestart: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User created successfully" });
      refetchUsers();
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserTier("FREE");
      setNewUserUsageLimit("5");
      setNewUserAutoRestart(false);
    },
    onError: (error: any) => {
      toast({ 
        title: error.message || "Failed to create user", 
        variant: "destructive" 
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      refetchUsers();
      setEditingUserId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: error.message || "Failed to update user", 
        variant: "destructive" 
      });
    },
  });

  const createTokenMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/admin/tokens", { userId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Token created successfully" });
      refetchTokens();
    },
  });

  const toggleTokenMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/tokens/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Token updated" });
      refetchTokens();
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/tokens/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Token deleted" });
      refetchTokens();
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const usageLimit = newUserTier === 'PREMIUM' ? 999999 : parseInt(newUserUsageLimit);
    createUserMutation.mutate({
      email: newUserEmail,
      firstName: newUserFirstName,
      lastName: newUserLastName,
      tier: newUserTier,
      usageLimit,
      autoRestart: newUserTier === 'PREMIUM' && newUserAutoRestart ? 'true' : 'false',
    });
  };

  const startEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditTier(user.tier);
    setEditUsageLimit(user.usageLimit.toString());
    setEditAutoRestart(user.autoRestart === 'true');
    setEditUsageCount(user.usageCount.toString());
  };

  const handleUpdateUser = () => {
    if (!editingUserId) return;
    updateUserMutation.mutate({
      userId: editingUserId,
      updates: {
        tier: editTier,
        usageLimit: parseInt(editUsageLimit),
        autoRestart: editAutoRestart ? 'true' : 'false',
        usageCount: parseInt(editUsageCount),
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleDownloadProject = () => {
    setIsDownloading(true);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = '/api/admin/download-project';
    
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      document.body.removeChild(iframe);
      setIsDownloading(false);
    }, 5000);
  };

  const githubPushMutation = useMutation({
    mutationFn: async (data: { 
      repoUrl: string; 
      branch: string; 
      token: string;
      commitMessage: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/github-push", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Successfully pushed to GitHub",
        description: data.hasChanges ? `Pushed to ${data.branch}` : "No changes to commit"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to push to GitHub", 
        description: error.message || "Unknown error",
        variant: "destructive" 
      });
    },
  });

  if (!adminCheck?.isAdmin && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  data-testid="input-admin-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  data-testid="input-admin-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-admin-login"
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadProject}
              disabled={isDownloading}
              data-testid="button-download-project"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download Project"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-7xl">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="tokens" data-testid="tab-tokens">
              <Key className="h-4 w-4 mr-2" />
              Tokens
            </TabsTrigger>
            <TabsTrigger value="github" data-testid="tab-github">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={newUserFirstName}
                        onChange={(e) => setNewUserFirstName(e.target.value)}
                        placeholder="John"
                        data-testid="input-user-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newUserLastName}
                        onChange={(e) => setNewUserLastName(e.target.value)}
                        placeholder="Doe"
                        data-testid="input-user-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                      data-testid="input-user-email"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tier">User Tier</Label>
                      <Select value={newUserTier} onValueChange={setNewUserTier}>
                        <SelectTrigger data-testid="select-user-tier">
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FREE">FREE</SelectItem>
                          <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newUserTier === 'FREE' && (
                      <div className="space-y-2">
                        <Label htmlFor="usageLimit">Usage Limit</Label>
                        <Input
                          id="usageLimit"
                          type="number"
                          value={newUserUsageLimit}
                          onChange={(e) => setNewUserUsageLimit(e.target.value)}
                          placeholder="5"
                          min="1"
                          data-testid="input-usage-limit"
                        />
                      </div>
                    )}
                  </div>
                  {newUserTier === 'PREMIUM' && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoRestart"
                        checked={newUserAutoRestart}
                        onCheckedChange={setNewUserAutoRestart}
                        data-testid="switch-auto-restart"
                      />
                      <Label htmlFor="autoRestart" className="cursor-pointer">
                        Enable Auto-Restart Service
                      </Label>
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                    data-testid="button-create-user"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users?.map((user: any) => (
                    <div
                      key={user.id}
                      className="p-4 rounded-lg border space-y-3"
                      data-testid={`user-${user.id}`}
                    >
                      {editingUserId === user.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Tier</Label>
                              <Select value={editTier} onValueChange={setEditTier}>
                                <SelectTrigger data-testid={`select-edit-tier-${user.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="FREE">FREE</SelectItem>
                                  <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Usage Limit</Label>
                              <Input
                                type="number"
                                value={editUsageLimit}
                                onChange={(e) => setEditUsageLimit(e.target.value)}
                                data-testid={`input-edit-usage-limit-${user.id}`}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Usage Count (Current)</Label>
                            <Input
                              type="number"
                              value={editUsageCount}
                              onChange={(e) => setEditUsageCount(e.target.value)}
                              data-testid={`input-edit-usage-count-${user.id}`}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={editAutoRestart}
                              onCheckedChange={setEditAutoRestart}
                              data-testid={`switch-edit-auto-restart-${user.id}`}
                            />
                            <Label>Auto-Restart Service</Label>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleUpdateUser}
                              disabled={updateUserMutation.isPending}
                              data-testid={`button-save-user-${user.id}`}
                            >
                              Save Changes
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUserId(null)}
                              data-testid={`button-cancel-edit-${user.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium" data-testid={`user-name-${user.id}`}>
                                  {user.firstName} {user.lastName}
                                </p>
                                <Badge 
                                  variant={user.tier === 'PREMIUM' ? 'default' : 'secondary'}
                                  data-testid={`user-tier-${user.id}`}
                                >
                                  {user.tier}
                                </Badge>
                                {user.autoRestart === 'true' && (
                                  <Badge variant="outline" data-testid={`user-auto-restart-${user.id}`}>
                                    Auto-Restart
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1" data-testid={`user-email-${user.id}`}>
                                {user.email}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1" data-testid={`user-usage-${user.id}`}>
                                Usage: {user.usageCount} / {user.tier === 'PREMIUM' ? 'Unlimited' : user.usageLimit}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEditUser(user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => createTokenMutation.mutate(user.id)}
                                disabled={createTokenMutation.isPending}
                                data-testid={`button-create-token-${user.id}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Token
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Access Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tokens?.map((tokenData: any) => (
                    <div
                      key={tokenData.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`token-${tokenData.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium" data-testid={`token-user-${tokenData.id}`}>
                            {tokenData.user?.firstName} {tokenData.user?.lastName}
                          </p>
                          <Badge variant={tokenData.isActive === 'true' ? 'default' : 'secondary'}>
                            {tokenData.isActive === 'true' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <code className="text-sm bg-muted px-2 py-1 rounded truncate block" data-testid={`token-value-${tokenData.id}`}>
                          {tokenData.token}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(tokenData.token)}
                          data-testid={`button-copy-token-${tokenData.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleTokenMutation.mutate({
                              id: tokenData.id,
                              isActive: tokenData.isActive === 'true' ? 'false' : 'true',
                            })
                          }
                          data-testid={`button-toggle-token-${tokenData.id}`}
                        >
                          {tokenData.isActive === 'true' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteTokenMutation.mutate(tokenData.id)}
                          data-testid={`button-delete-token-${tokenData.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!tokens || tokens.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No tokens found. Create a user first, then generate a token for them.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="github" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Push to GitHub
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github-repo-url">Repository URL</Label>
                  <Input
                    id="github-repo-url"
                    type="text"
                    placeholder="https://github.com/username/repository"
                    value={githubRepoUrl}
                    onChange={(e) => setGithubRepoUrl(e.target.value)}
                    data-testid="input-github-repo-url"
                  />
                  <p className="text-sm text-muted-foreground">
                    The HTTPS URL of your GitHub repository
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github-branch">Branch</Label>
                  <Input
                    id="github-branch"
                    type="text"
                    placeholder="main"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    data-testid="input-github-branch"
                  />
                  <p className="text-sm text-muted-foreground">
                    The branch to push to (default: main)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github-token">GitHub Personal Access Token</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    data-testid="input-github-token"
                  />
                  <p className="text-sm text-muted-foreground">
                    Create a token at GitHub → Settings → Developer settings → Personal access tokens
                    <br />
                    Required scopes: <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github-commit-message">Commit Message (optional)</Label>
                  <Input
                    id="github-commit-message"
                    type="text"
                    placeholder="Update from admin panel"
                    value={githubCommitMessage}
                    onChange={(e) => setGithubCommitMessage(e.target.value)}
                    data-testid="input-github-commit-message"
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty to use default message with timestamp
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (!githubRepoUrl || !githubToken) {
                        toast({
                          title: "Missing required fields",
                          description: "Please provide repository URL and GitHub token",
                          variant: "destructive"
                        });
                        return;
                      }
                      githubPushMutation.mutate({
                        repoUrl: githubRepoUrl,
                        branch: githubBranch || "main",
                        token: githubToken,
                        commitMessage: githubCommitMessage
                      });
                    }}
                    disabled={githubPushMutation.isPending}
                    data-testid="button-github-push"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {githubPushMutation.isPending ? "Pushing..." : "Push to GitHub"}
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">ℹ️ Important Notes:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>This will commit and push ALL files including bot uploads</li>
                    <li>Make sure your <code className="text-xs bg-background px-1 py-0.5 rounded">.gitignore</code> is configured correctly</li>
                    <li>If you're deploying to Render with auto-deploy, this will trigger a redeploy</li>
                    <li>Your GitHub token is NOT stored - you need to enter it each time</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
