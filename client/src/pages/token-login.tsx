import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Key, ArrowLeft, MessageCircle, Mail, Sparkles, Shield } from "lucide-react";
import { SiTelegram } from "react-icons/si";
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

      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-6 pb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-2 shadow-lg">
            <Key className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              Secure Access Portal
            </CardTitle>
            <CardDescription className="text-base">
              Enter your access token to unlock the dashboard
            </CardDescription>
          </div>
          
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shrink-0">
                <SiTelegram className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-2">First Time? Start the Bot!</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Before using your token, start a chat with our bot:
                </p>
                <a 
                  href="https://t.me/TELEBOT_HOSTER_xBOT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover-elevate active-elevate-2 text-sm font-medium"
                  data-testid="link-start-bot"
                >
                  <SiTelegram className="h-4 w-4" />
                  Start @TELEBOT_HOSTER_xBOT
                </a>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Access Token
              </Label>
              <Input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="BACK-XXXXXXXX"
                data-testid="input-access-token"
                className="font-mono text-lg h-12"
              />
              <p className="text-xs text-muted-foreground">
                Your unique access token starts with BACK-
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={loginMutation.isPending}
              data-testid="button-token-login"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Access Dashboard
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2">
          <div className="w-full h-px bg-border" />
          <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="default" className="w-full" data-testid="button-forgot-token">
                <Key className="h-4 w-4 mr-2" />
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
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shrink-0">
                        <SiTelegram className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-2">Important: Start the Bot First!</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Before requesting your token, start a chat with our bot:
                        </p>
                        <a 
                          href="https://t.me/TELEBOT_HOSTER_xBOT"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover-elevate active-elevate-2 text-sm font-medium"
                          data-testid="link-start-bot-forgot"
                        >
                          <SiTelegram className="h-4 w-4" />
                          Start @TELEBOT_HOSTER_xBOT
                        </a>
                        <p className="text-xs text-muted-foreground mt-2">
                          Click above, then send /start to the bot
                        </p>
                      </div>
                    </div>
                  </div>
                  
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
                    <p className="text-xs text-muted-foreground">
                      Your Telegram username (make sure you've started the bot above)
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={requestOTPMutation.isPending}
                    data-testid="button-request-otp"
                  >
                    {requestOTPMutation.isPending ? "Sending..." : "Send OTP to Telegram"}
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
          
          <div className="text-center text-sm">
            <p className="text-muted-foreground mb-2">Need help?</p>
            <a 
              href="https://t.me/BACK_BENCHERS_x17"
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              data-testid="link-footer-support"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </a>
          </div>
        </CardFooter>
      </Card>
      <Footer />
    </div>
  );
}
