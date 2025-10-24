import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { useLocation, Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { TelegramLoginWidget } from "@/components/TelegramLoginWidget";

export default function TokenLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const telegramLoginMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/auth/telegram-login", userData);
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
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleTelegramAuth = (user: any) => {
    telegramLoginMutation.mutate(user);
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
            Back to Home
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-lg shadow-2xl border-2">
        <CardHeader className="space-y-6 pb-8 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#0088cc] to-[#0088cc]/80 shadow-2xl">
            <SiTelegram className="h-12 w-12 text-white" />
          </div>
          <div className="text-center space-y-3">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-lg">
              Login securely with your Telegram account
            </CardDescription>
          </div>
          
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-chart-2/10 border-2 border-primary/20 p-5 shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg shrink-0">
                <SiTelegram className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold mb-2">🚀 Quick & Secure Access</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Click the Telegram button below to login instantly. No passwords needed!
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pb-6 px-8">
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Authenticate with Telegram to access your dashboard
            </p>
            <TelegramLoginWidget 
              botUsername={import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "TELEBOT_HOSTER_xBOT"}
              onAuth={handleTelegramAuth}
              buttonSize="large"
            />
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              By logging in, you agree to our terms and conditions. Your Telegram data is used only for authentication.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 pt-2 px-8 pb-8 bg-gradient-to-t from-muted/20 to-transparent">
          <div className="text-center w-full">
            <p className="text-sm text-muted-foreground mb-3">Need assistance?</p>
            <a 
              href="https://t.me/BACK_BENCHERS_x17"
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium text-sm transition-all hover-elevate"
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
