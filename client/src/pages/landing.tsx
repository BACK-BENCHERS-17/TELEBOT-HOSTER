import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Upload, 
  Zap, 
  Activity, 
  Shield, 
  Code2, 
  Rocket,
  Key,
  MessageCircle,
  Sparkles
} from "lucide-react";
import { SiPython, SiNodedotjs, SiTelegram } from "react-icons/si";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";

export default function Landing() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupFirstName, setLookupFirstName] = useState("");
  const [lookupLastName, setLookupLastName] = useState("");
  const [foundToken, setFoundToken] = useState<string | null>(null);

  const { data: contactInfo } = useQuery<{ contact: string }>({
    queryKey: ["/api/auth/contact-info"],
  });

  const createTokenMutation = useMutation({
    mutationFn: async (userData: { email: string; firstName: string; lastName: string }) => {
      const res = await apiRequest("POST", "/api/public/create-token", userData);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedToken(data.token);
      toast({
        title: "Token created successfully!",
        description: "Your free access token has been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create token",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const lookupTokenMutation = useMutation({
    mutationFn: async (lookupData: { email: string; firstName: string; lastName: string }) => {
      const res = await apiRequest("POST", "/api/public/lookup-token", lookupData);
      return res.json();
    },
    onSuccess: (data) => {
      setFoundToken(data.token);
      toast({
        title: "Token found!",
        description: "Your access token has been retrieved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Token not found",
        description: error.message || "Please check your details and try again",
        variant: "destructive",
      });
    },
  });

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      toast({
        title: "All fields required",
        description: "Please enter your email, first name, and last name",
        variant: "destructive",
      });
      return;
    }
    createTokenMutation.mutate({ 
      email: email.trim(), 
      firstName: firstName.trim(), 
      lastName: lastName.trim() 
    });
  };

  const handleLookupToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim() || !lookupFirstName.trim() || !lookupLastName.trim()) {
      toast({
        title: "All fields required",
        description: "Please enter your email, first name, and last name",
        variant: "destructive",
      });
      return;
    }
    lookupTokenMutation.mutate({
      email: lookupEmail.trim(),
      firstName: lookupFirstName.trim(),
      lastName: lookupLastName.trim()
    });
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Reset state when dialog closes (via backdrop, ESC, or button)
      setEmail("");
      setFirstName("");
      setLastName("");
      setGeneratedToken(null);
      createTokenMutation.reset();
    }
  };

  const handleForgotDialogChange = (open: boolean) => {
    setForgotDialogOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setLookupEmail("");
      setLookupFirstName("");
      setLookupLastName("");
      setFoundToken(null);
      lookupTokenMutation.reset();
    }
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
            <span className="text-xl font-bold">TELEBOT HOSTER</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
              <Key className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Token-Based Access</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary to-chart-2 bg-clip-text text-transparent">
                Host Your Telegram Bot
              </span>
              <br />
              <span>with Secure Access</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload your Python or Node.js bot, deploy instantly, and monitor with real-time logs. 
              Token-based authentication for enhanced security.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 pt-4">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                  <DialogTrigger asChild>
                    <Button 
                      size="lg" 
                      className="px-8 py-6 text-lg"
                      data-testid="button-create-token"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Create Free Token
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-create-token">
                    <DialogHeader>
                      <DialogTitle>Create Your Free Access Token</DialogTitle>
                      <DialogDescription>
                        Enter your details to get instant access to the bot hosting platform
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!generatedToken ? (
                      <form onSubmit={handleCreateToken} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="John"
                              data-testid="input-first-name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Doe"
                              data-testid="input-last-name"
                              required
                            />
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
                            data-testid="input-email"
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={createTokenMutation.isPending}
                          data-testid="button-submit-create-token"
                        >
                          {createTokenMutation.isPending ? "Creating..." : "Generate Free Token"}
                        </Button>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-lg bg-card/50 p-4 border">
                          <Label className="text-sm text-muted-foreground mb-2 block">Your Access Token</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-background rounded text-sm font-mono" data-testid="text-generated-token">
                              {generatedToken}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedToken);
                                toast({ title: "Token copied to clipboard!" });
                              }}
                              data-testid="button-copy-token"
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Save this token securely. You'll need it to access the dashboard.
                        </div>
                        <div className="flex gap-2">
                          <Link href="/token-login" className="flex-1">
                            <Button className="w-full" data-testid="button-use-token">
                              <Key className="mr-2 h-4 w-4" />
                              Use Token Now
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            onClick={() => handleDialogChange(false)}
                            data-testid="button-close-dialog"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Link href="/token-login">
                  <Button 
                    variant="default"
                    size="lg" 
                    className="px-8 py-6 text-lg bg-chart-2 hover:bg-chart-2 border-chart-2"
                    data-testid="button-token-access"
                  >
                    <Key className="mr-2 h-5 w-5" />
                    I Have a Token
                  </Button>
                </Link>
              </div>

              <Dialog open={forgotDialogOpen} onOpenChange={handleForgotDialogChange}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="sm"
                    data-testid="button-forgot-token"
                  >
                    Forgot your token?
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-forgot-token">
                  <DialogHeader>
                    <DialogTitle>Retrieve Your Access Token</DialogTitle>
                    <DialogDescription>
                      Enter your details to find your existing access token
                    </DialogDescription>
                  </DialogHeader>
                  
                  {!foundToken ? (
                    <form onSubmit={handleLookupToken} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="lookupFirstName">First Name</Label>
                          <Input
                            id="lookupFirstName"
                            type="text"
                            value={lookupFirstName}
                            onChange={(e) => setLookupFirstName(e.target.value)}
                            placeholder="John"
                            data-testid="input-lookup-first-name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lookupLastName">Last Name</Label>
                          <Input
                            id="lookupLastName"
                            type="text"
                            value={lookupLastName}
                            onChange={(e) => setLookupLastName(e.target.value)}
                            placeholder="Doe"
                            data-testid="input-lookup-last-name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lookupEmail">Email Address</Label>
                        <Input
                          id="lookupEmail"
                          type="email"
                          value={lookupEmail}
                          onChange={(e) => setLookupEmail(e.target.value)}
                          placeholder="your@email.com"
                          data-testid="input-lookup-email"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={lookupTokenMutation.isPending}
                        data-testid="button-submit-lookup-token"
                      >
                        {lookupTokenMutation.isPending ? "Searching..." : "Find My Token"}
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-card/50 p-4 border">
                        <Label className="text-sm text-muted-foreground mb-2 block">Your Access Token</Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-background rounded text-sm font-mono" data-testid="text-found-token">
                            {foundToken}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(foundToken);
                              toast({ title: "Token copied to clipboard!" });
                            }}
                            data-testid="button-copy-found-token"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Use this token to access the dashboard.
                      </div>
                      <div className="flex gap-2">
                        <Link href="/token-login" className="flex-1">
                          <Button className="w-full" data-testid="button-use-found-token">
                            <Key className="mr-2 h-4 w-4" />
                            Use Token Now
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          onClick={() => handleForgotDialogChange(false)}
                          data-testid="button-close-forgot-dialog"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Card className="p-6 bg-card/50 max-w-md">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium mb-1">Need help?</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Contact support for assistance
                    </p>
                    <a 
                      href={`https://${contactInfo?.contact || 't.me/BACK_BENCHERS_x17'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Badge className="bg-[#0088cc] hover:bg-[#0088cc]/90 text-white gap-2">
                        <SiTelegram className="h-4 w-4" />
                        {contactInfo?.contact || 't.me/BACK_BENCHERS_x17'}
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
              <h3 className="text-xl font-semibold">Get Access Token</h3>
              <p className="text-muted-foreground">
                Contact the developer via Telegram to receive your unique free access token.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Upload ZIP File</h3>
              <p className="text-muted-foreground">
                Drop your bot's ZIP file, select runtime, and add environment variables.
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
            Secure, reliable bot hosting with token-based authentication.
          </p>
          <Link href="/token-login">
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg"
              data-testid="button-get-started"
            >
              <Key className="mr-2 h-5 w-5" />
              Get Started with Token
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
