import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, FileArchive, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface DeployBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EnvVar {
  key: string;
  value: string;
}

export function DeployBotDialog({ open, onOpenChange }: DeployBotDialogProps) {
  const { toast } = useToast();
  const [botName, setBotName] = useState("");
  const [runtime, setRuntime] = useState<string>("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([{ key: "", value: "" }]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setZipFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    maxFiles: 1,
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!zipFile || !botName || !runtime) {
        throw new Error("Please fill all required fields");
      }

      const formData = new FormData();
      formData.append('file', zipFile);
      formData.append('name', botName);
      formData.append('runtime', runtime);
      
      const validEnvVars = envVars.filter(v => v.key && v.value);
      formData.append('envVars', JSON.stringify(validEnvVars));

      const response = await fetch('/api/bots/deploy', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deployment failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bot Deployed!",
        description: "Your bot has been deployed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setBotName("");
    setRuntime("");
    setZipFile(null);
    setEnvVars([{ key: "", value: "" }]);
    onOpenChange(false);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deploy New Bot</DialogTitle>
          <DialogDescription>
            Upload your bot ZIP file and configure deployment settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Bot Name */}
          <div className="space-y-2">
            <Label htmlFor="bot-name">Bot Name *</Label>
            <Input
              id="bot-name"
              placeholder="My Awesome Bot"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              data-testid="input-bot-name"
            />
          </div>

          {/* Runtime Selection */}
          <div className="space-y-2">
            <Label htmlFor="runtime">Runtime *</Label>
            <Select value={runtime} onValueChange={setRuntime}>
              <SelectTrigger id="runtime" data-testid="select-runtime">
                <SelectValue placeholder="Select runtime" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python 3.11</SelectItem>
                <SelectItem value="nodejs">Node.js 18</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ZIP File Upload */}
          <div className="space-y-2">
            <Label>Bot Files (ZIP) *</Label>
            {!zipFile ? (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                `}
                data-testid="dropzone-upload"
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive
                    ? "Drop your ZIP file here..."
                    : "Drag and drop your bot ZIP file here, or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: .zip files only
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-card" data-testid="file-preview">
                <FileArchive className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{zipFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(zipFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZipFile(null)}
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Environment Variables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Environment Variables</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addEnvVar}
                data-testid="button-add-env-var"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Variable
              </Button>
            </div>
            <div className="space-y-3">
              {envVars.map((envVar, index) => (
                <div key={index} className="flex gap-2" data-testid={`env-var-${index}`}>
                  <Input
                    placeholder="KEY"
                    value={envVar.key}
                    onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                    className="flex-1"
                    data-testid={`input-env-key-${index}`}
                  />
                  <Input
                    placeholder="value"
                    type="password"
                    value={envVar.value}
                    onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                    className="flex-1"
                    data-testid={`input-env-value-${index}`}
                  />
                  {envVars.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnvVar(index)}
                      data-testid={`button-remove-env-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Add your TELEGRAM_BOT_TOKEN and other secrets here. They'll be securely stored.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-deploy">
            Cancel
          </Button>
          <Button 
            onClick={() => deployMutation.mutate()} 
            disabled={deployMutation.isPending || !zipFile || !botName || !runtime}
            data-testid="button-confirm-deploy"
          >
            {deployMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              "Deploy Bot"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
