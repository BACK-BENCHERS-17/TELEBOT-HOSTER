import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MiniAppConsentProps {
  open: boolean;
  onConsent: (allowMessages: boolean) => void;
  onCancel: () => void;
}

export function MiniAppConsent({ open, onConsent, onCancel }: MiniAppConsentProps) {
  const [allowMessages, setAllowMessages] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Reset state when dialog closes to avoid stale selections
  useEffect(() => {
    if (!open) {
      setAllowMessages(true);
      setAgreedToTerms(false);
    }
  }, [open]);

  const handleStart = () => {
    if (agreedToTerms) {
      onConsent(allowMessages);
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-lg" data-testid="dialog-mini-app-consent">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">Terms of Service</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Review and accept the Terms of Service for Mini Apps before proceeding
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="max-h-80 pr-4">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              By launching this mini app, you agree to the following Terms of Service:
            </p>
            
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-semibold text-foreground">1. Service Usage</h4>
                <p className="text-muted-foreground">
                  You agree to use the TELEBOT HOSTER service only for lawful purposes and in accordance with these terms. You are responsible for all content and activity on your account.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-semibold text-foreground">2. Bot Content Responsibility</h4>
                <p className="text-muted-foreground">
                  You are solely responsible for the content, functionality, and operation of any bots you deploy. We reserve the right to suspend or terminate bots that violate our policies or applicable laws.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-semibold text-foreground">3. Data and Privacy</h4>
                <p className="text-muted-foreground">
                  Your bot files and environment variables are stored securely. We do not access or modify your bot code without your explicit permission. Log data may be retained for debugging purposes.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-semibold text-foreground">4. Service Availability</h4>
                <p className="text-muted-foreground">
                  While we strive for maximum uptime, we do not guarantee uninterrupted service. Free tier users may experience limitations on deployment count and runtime hours.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-semibold text-foreground">5. Account Security</h4>
                <p className="text-muted-foreground">
                  You are responsible for maintaining the security of your Telegram account credentials. Notify us immediately if you suspect unauthorized access.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Checkbox
              id="allow-messages"
              checked={allowMessages}
              onCheckedChange={(checked) => setAllowMessages(checked as boolean)}
              data-testid="checkbox-allow-messages"
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="allow-messages"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Allow Bot to send me messages
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Enables notifications about bot status, deployments, and important updates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="agree-terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              data-testid="checkbox-agree-terms"
              className="mt-0.5"
            />
            <Label
              htmlFor="agree-terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I agree to the Terms of Service for Mini Apps
            </Label>
          </div>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onCancel} data-testid="button-cancel-consent">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleStart}
            disabled={!agreedToTerms}
            data-testid="button-start-consent"
          >
            Start
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
