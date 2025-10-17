import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Key, ArrowLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function TokenLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (accessToken: string) => {
      const res = await apiRequest("POST", "/api/auth/token-login", { token: accessToken });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
      toast({ title: "Login successful!" });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid or inactive token",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast({
        title: "Token required",
        description: "Please enter your access token",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(token.trim());
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Key className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl mb-2">Access with Token</CardTitle>
            <CardDescription>
              Enter your access token to continue
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Access Token</Label>
              <Input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your access token"
                data-testid="input-access-token"
                className="font-mono"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-token-login"
            >
              {loginMutation.isPending ? "Logging in..." : "Access Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
