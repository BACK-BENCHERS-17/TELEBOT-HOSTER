import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Key, ArrowLeft, MessageCircle, Mail } from "lucide-react";
import { useLocation, Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function TokenLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [step, setStep] = useState<'request' | 'verify'>('request');
  
  // Forgot token form states
  const [email, setEmail] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [otp, setOtp] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (accessToken: string) => {
      const res = await apiRequest("POST", "/api/auth/token-login", { token: accessToken });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/dashboard");
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

  const requestOTPMutation = useMutation({
    mutationFn: async (data: { email: string; telegramUsername: string }) => {
      const res = await apiRequest("POST", "/api/auth/request-otp", data);
      return res.json();
    },
    onSuccess: () => {
      setStep('verify');
      toast({ 
        title: "OTP Sent!",
        description: "Check your Telegram messages for the OTP code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please verify your information and try again",
        variant: "destructive",
      });
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: { telegramUsername: string; otp: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Token Recovered!",
        description: "Your access token has been sent to your Telegram account.",
      });
      setForgotDialogOpen(false);
      setStep('request');
      setEmail("");
      setTelegramUsername("");
      setOtp("");
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid OTP code",
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

  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !telegramUsername.trim()) {
      toast({
        title: "All fields required",
        description: "Please enter both your email and Telegram username",
        variant: "destructive",
      });
      return;
    }
    requestOTPMutation.mutate({ email: email.trim(), telegramUsername: telegramUsername.trim() });
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({
        title: "OTP required",
        description: "Please enter the OTP code sent to your Telegram",
        variant: "destructive",
      });
      return;
    }
    verifyOTPMutation.mutate({ telegramUsername: telegramUsername.trim(), otp: otp.trim() });
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
                placeholder="BACK-XXXXXXXX"
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
        <CardFooter className="flex flex-col gap-3">
          <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm" data-testid="button-forgot-token">
                Forgot your token?
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Recover Your Token</DialogTitle>
                <DialogDescription>
                  {step === 'request' 
                    ? "Enter your account details to receive an OTP via Telegram"
                    : "Enter the OTP sent to your Telegram account"}
                </DialogDescription>
              </DialogHeader>
              
              {step === 'request' ? (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      data-testid="input-recovery-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram">Telegram Username</Label>
                    <Input
                      id="telegram"
                      type="text"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="@username"
                      data-testid="input-telegram-username"
                    />
                  </div>
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="mb-2 font-medium">Before requesting OTP:</p>
                    <p className="text-muted-foreground mb-2">
                      Make sure you've started a chat with our bot first
                    </p>
                    <div className="flex gap-2">
                      <a 
                        href="https://t.me/BACK_BENCHERS" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                        data-testid="link-telegram-back-benchers"
                      >
                        <MessageCircle className="h-3 w-3" />
                        t.me/BACK_BENCHERS
                      </a>
                      <span className="text-muted-foreground">or</span>
                      <a 
                        href="https://t.me/Dpx_Army_ff_01" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                        data-testid="link-telegram-dpx"
                      >
                        <MessageCircle className="h-3 w-3" />
                        t.me/Dpx_Army_ff_01
                      </a>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={requestOTPMutation.isPending}
                    data-testid="button-request-otp"
                  >
                    {requestOTPMutation.isPending ? "Sending..." : "Send OTP"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">OTP Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      data-testid="input-otp-code"
                      className="font-mono text-center text-2xl tracking-widest"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep('request')}
                      data-testid="button-back-to-request"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={verifyOTPMutation.isPending}
                      data-testid="button-verify-otp"
                    >
                      {verifyOTPMutation.isPending ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Need help? Contact us:</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <a 
                href="https://t.me/BACK_BENCHERS" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-footer-back-benchers"
              >
                t.me/BACK_BENCHERS
              </a>
              <span>|</span>
              <a 
                href="https://t.me/Dpx_Army_ff_01" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-footer-dpx"
              >
                t.me/Dpx_Army_ff_01
              </a>
            </div>
          </div>
        </CardFooter>
      </Card>
      <Footer />
    </div>
  );
}
