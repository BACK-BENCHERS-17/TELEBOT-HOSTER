import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Zap, 
  Activity, 
  Shield, 
  Code2, 
  Rocket,
  MessageCircle
} from "lucide-react";
import { SiPython, SiNodedotjs, SiTelegram } from "react-icons/si";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { TelegramLoginWidget } from "@/components/TelegramLoginWidget";

export default function Landing() {
  const { toast } = useToast();

  const { data: contactInfo } = useQuery<{ contact: string }>({
    queryKey: ["/api/auth/contact-info"],
  });

  const telegramLoginMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/auth/telegram-login", userData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Login Successful!",
        description: "Welcome to your dashboard.",
      });
      window.location.href = "/dashboard";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TELE HOST</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
              <SiTelegram className="h-4 w-4 text-[#0088cc]" />
              <span className="text-muted-foreground">Telegram Authentication</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary to-chart-2 bg-clip-text text-transparent">
                Host Your Telegram Bot
              </span>
              <br />
              <span>Instantly & Securely</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload your Python or Node.js bot, deploy instantly, and monitor with real-time logs. 
              Login securely with your Telegram account.
            </p>

            <div className="flex flex-col items-center justify-center gap-6 pt-6">
              <div className="rounded-xl bg-gradient-to-br from-primary/10 to-chart-2/10 border-2 border-primary/20 p-6 shadow-md max-w-md">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
                    <SiTelegram className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold mb-2">Login with Telegram</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Secure, instant access to your bot dashboard
                    </p>
                  </div>
                  <TelegramLoginWidget 
                    botUsername={import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "TELEHOSTxBOT"}
                    onAuth={handleTelegramAuth}
                    buttonSize="large"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    By logging in, you agree to our terms and conditions
                  </p>
                </div>
              </div>

              <Card className="p-6 bg-card/50 max-w-md">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium mb-1">💬 Need help?</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get instant support from our team
                    </p>
                    <a 
                      href={`https://${contactInfo?.contact || 't.me/BACK_BENCHERS17'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex hover-elevate active-elevate-2 transition-all"
                      data-testid="link-support"
                    >
                      <Badge className="bg-gradient-to-r from-[#0088cc] to-[#0088cc]/80 hover:from-[#0088cc]/90 hover:to-[#0088cc]/70 text-white gap-2 text-xs font-semibold px-3 py-1.5">
                        <SiTelegram className="h-4 w-4" />
                        {contactInfo?.contact || 't.me/BACK_BENCHERS17'}
                      </Badge>
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">One-Click Deploy</h3>
              <p className="text-muted-foreground">
                Simply upload your bot ZIP file and we'll handle the rest. No complex configuration needed.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10 mb-4">
                <Activity className="h-6 w-6 text-chart-3" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Logs</h3>
              <p className="text-muted-foreground">
                Monitor your bot's activity with live log streaming. Catch errors instantly.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10 mb-4">
                <Code2 className="h-6 w-6 text-chart-2" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Python & Node.js</h3>
              <p className="text-muted-foreground">
                Support for both Python and Node.js bots. Choose your preferred runtime.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10 mb-4">
                <Shield className="h-6 w-6 text-chart-4" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Environment</h3>
              <p className="text-muted-foreground">
                Your bot tokens and secrets are encrypted and stored securely.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-5/10 mb-4">
                <Zap className="h-6 w-6 text-chart-5" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Auto-scaling</h3>
              <p className="text-muted-foreground">
                Your bot automatically scales based on usage. No manual intervention required.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">99.9% Uptime</h3>
              <p className="text-muted-foreground">
                Reliable infrastructure ensures your bot is always online and responsive.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Login with Telegram</h3>
              <p className="text-muted-foreground">
                Click the Telegram login button above to securely authenticate with your Telegram account. No passwords or tokens needed.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Upload Your Bot</h3>
              <p className="text-muted-foreground">
                Upload your bot ZIP file, select runtime (Python or Node.js), and configure environment variables.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Bot Goes Live</h3>
              <p className="text-muted-foreground">
                Your bot is deployed and running. Monitor logs and manage everything from one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Runtimes */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-8">Supported Runtimes</h2>
          <div className="flex justify-center gap-12">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#3776ab]/10">
                <SiPython className="h-12 w-12 text-[#3776ab]" />
              </div>
              <span className="text-lg font-medium">Python 3.11</span>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#339933]/10">
                <SiNodedotjs className="h-12 w-12 text-[#339933]" />
              </div>
              <span className="text-lg font-medium">Node.js 18</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-4xl font-bold">Ready to Deploy Your Bot?</h2>
          <p className="text-xl text-muted-foreground">
            Secure, reliable bot hosting with Telegram authentication.
          </p>
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Scroll up to login with Telegram and get started
            </p>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              data-testid="button-scroll-to-login"
            >
              <SiTelegram className="mr-2 h-5 w-5" />
              Back to Login
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
