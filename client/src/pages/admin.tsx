import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, Users, Trash2, Plus, LogOut, Edit, Download, Upload, Github, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";
import { Footer } from "@/components/Footer";

export default function AdminPanel() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [userSearch, setUserSearch] = useState("");

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
  const [githubForcePush, setGithubForcePush] = useState(false);

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/auth/admin-check"],
  });

  const { data: users, refetch: refetchUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
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


  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      refetchUsers();
    },
    onError: (error: any) => {
      toast({ 
        title: error.message || "Failed to delete user", 
        variant: "destructive" 
      });
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


  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!userSearch.trim()) return users;
    
    const searchLower = userSearch.toLowerCase();
    return users.filter((user: any) => 
      user.email?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower)
    );
  }, [users, userSearch]);


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
      forcePush: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/admin/github-push", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Successfully pushed to GitHub",
        description: data.hasChanges ? `Pushed to ${data.branch}` : "No changes to commit"
      });
      setGithubToken("");
      setGithubForcePush(false);
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
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
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
                        placeholder="Back"
                        data-testid="input-user-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newUserLastName}
                        onChange={(e) => setNewUserLastName(e.target.value)}
                        placeholder="Benchers"
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
                      placeholder="backbenchers@example.com"
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
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription className="mt-1">
                      {filteredUsers?.length || 0} user{filteredUsers?.length !== 1 ? 's' : ''} found
                    </CardDescription>
                  </div>
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-users"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found matching your search
                    </div>
                  ) : (
                    filteredUsers?.map((user: any) => (
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
                                size="icon"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
                                    deleteUserMutation.mutate(user.id);
                                  }
                                }}
                                disabled={deleteUserMutation.isPending}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    ))
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

                <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
                  <Switch
                    id="github-force-push"
                    checked={githubForcePush}
                    onCheckedChange={setGithubForcePush}
                    data-testid="switch-github-force-push"
                  />
                  <div className="flex-1">
                    <Label htmlFor="github-force-push" className="cursor-pointer font-medium">
                      Force Push
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Overwrite remote changes. Use with caution!
                    </p>
                  </div>
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
                        commitMessage: githubCommitMessage,
                        forcePush: githubForcePush
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
      <Footer />
    </div>
  );
}
