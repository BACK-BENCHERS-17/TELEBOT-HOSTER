import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function Footer() {
  const { data: contactInfo } = useQuery<{ contact: string }>({
    queryKey: ["/api/auth/contact-info"],
  });

  return (
    <footer className="border-t bg-card/50 py-8 px-4 mt-auto">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">
              MADE BY DPX AND BACK BENCHERS
            </span>
          </div>
          
          <a
            href={`https://${contactInfo?.contact || 't.me/BACK_BENCHERS_x17'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-md transition-colors"
            data-testid="link-contact-owner"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Contact for Premium & Support</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
