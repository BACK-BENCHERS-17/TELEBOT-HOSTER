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
import { Shield, Users, Key, Copy, Trash2, Plus, LogOut } from "lucide-react";
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

  const { data: adminCheck } = useQuery({
    queryKey: ["/api/auth/admin-check"],
  });

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: adminCheck?.isAdmin || isLoggedIn,
  });

  const { data: tokens, refetch: refetchTokens } = useQuery({
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
    mutationFn: async (userData: { email: string; firstName: string; lastName: string }) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User created successfully" });
      refetchUsers();
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
    },
    onError: (error: any) => {
      toast({ 
        title: error.message || "Failed to create user", 
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
    createUserMutation.mutate({
      email: newUserEmail,
      firstName: newUserFirstName,
      lastName: newUserLastName,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="tokens" data-testid="tab-tokens">
              <Key className="h-4 w-4 mr-2" />
              Tokens
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
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`user-${user.id}`}
                    >
                      <div>
                        <p className="font-medium" data-testid={`user-name-${user.id}`}>
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`user-email-${user.id}`}>
                          {user.email}
                        </p>
                      </div>
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
        </Tabs>
      </main>
    </div>
  );
}
