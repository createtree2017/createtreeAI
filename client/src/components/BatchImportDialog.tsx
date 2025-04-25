import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, FileJson, Upload } from "lucide-react";

// Define the JSON schema for persona validation
const personaJsonSchema = z.object({
  personaId: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  avatarEmoji: z.string().min(1, "Avatar emoji is required"),
  description: z.string().min(1, "Description is required"),
  welcomeMessage: z.string().min(1, "Welcome message is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  primaryColor: z.string().min(1, "Primary color is required"),
  secondaryColor: z.string().min(1, "Secondary color is required"),
  personality: z.string().optional(),
  tone: z.string().optional(),
  usageContext: z.string().optional(),
  emotionalKeywords: z.array(z.string()).optional(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "night", "all"]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
  categories: z.array(z.string()).optional(),
});

// Define schema for array of personas
const personaBatchSchema = z.array(personaJsonSchema);

interface BatchImportDialogProps {
  onSuccess: () => void;
  categories: any[];
}

export default function BatchImportDialog({ onSuccess, categories }: BatchImportDialogProps) {
  const [jsonContent, setJsonContent] = useState("");
  const [activeTab, setActiveTab] = useState("json");
  const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validPersonas, setValidPersonas] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // Mutation for batch importing personas
  const batchImportMutation = useMutation({
    mutationFn: async (personas: any[]) => {
      const results = [];
      // Process each persona sequentially
      for (const persona of personas) {
        const result = await apiRequest("/api/admin/personas/batch", {
          method: "POST",
          body: JSON.stringify(persona),
        });
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      toast({
        title: "Import successful",
        description: `Successfully imported ${validPersonas.length} characters.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: "There was an error importing the characters. Please try again.",
        variant: "destructive",
      });
      console.error("Error importing personas:", error);
    },
  });

  // Reset the form
  const resetForm = () => {
    setJsonContent("");
    setValidationStatus("idle");
    setValidationErrors([]);
    setValidPersonas([]);
  };

  // Handle JSON validation
  const validateJson = () => {
    try {
      setValidationStatus("validating");
      setValidationErrors([]);
      
      // Parse JSON
      let parsed;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (e) {
        throw new Error("Invalid JSON format. Please check your syntax.");
      }

      // Check if it's an array
      if (!Array.isArray(parsed)) {
        parsed = [parsed]; // Convert single object to array
      }

      // Validate against schema
      const validation = personaBatchSchema.safeParse(parsed);
      
      if (validation.success) {
        setValidPersonas(validation.data);
        setValidationStatus("valid");
      } else {
        const errors = validation.error.errors.map(err => 
          `${err.path.join('.')} - ${err.message}`
        );
        setValidationErrors(errors);
        setValidationStatus("invalid");
      }
    } catch (error: any) {
      setValidationErrors([error.message || "Unknown error"]);
      setValidationStatus("invalid");
    }
  };

  // Handle import submission
  const handleImport = () => {
    if (validationStatus === "valid" && validPersonas.length > 0) {
      batchImportMutation.mutate(validPersonas);
    } else {
      toast({
        title: "Validation required",
        description: "Please validate your data before importing.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Batch Import Characters</h3>
        <p className="text-sm text-gray-500">
          Import multiple chat characters at once using JSON format.
        </p>
      </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="json" className="flex items-center">
              <FileJson className="w-4 h-4 mr-2" />
              JSON Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="pt-4">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="json-input" className="text-sm font-medium">
                  JSON Data
                </label>
                <Textarea
                  id="json-input"
                  placeholder='[
  {
    "personaId": "example-persona",
    "name": "Example Persona",
    "avatarEmoji": "😊",
    "description": "An example persona for batch import",
    "welcomeMessage": "Hello! I am an example persona.",
    "systemPrompt": "You are an example persona...",
    "primaryColor": "#7c3aed",
    "secondaryColor": "#ddd6fe",
    "timeOfDay": "all",
    "categories": ["example"]
  }
]'
                  className="h-64 font-mono text-sm"
                  value={jsonContent}
                  onChange={(e) => {
                    setJsonContent(e.target.value);
                    setValidationStatus("idle");
                  }}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={validateJson}
                  disabled={!jsonContent.trim() || validationStatus === "validating"}
                >
                  Validate JSON
                </Button>
              </div>

              {/* Validation Status */}
              {validationStatus === "valid" && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">Valid JSON</AlertTitle>
                  <AlertDescription>
                    Found {validPersonas.length} valid character{validPersonas.length !== 1 ? 's' : ''} ready to import.
                  </AlertDescription>
                </Alert>
              )}

              {validationStatus === "invalid" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Invalid JSON</AlertTitle>
                  <AlertDescription className="max-h-32 overflow-y-auto">
                    <ul className="list-disc list-inside">
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex space-x-2 justify-end mt-6">
          <Button 
            onClick={handleImport}
            disabled={validationStatus !== "valid" || validPersonas.length === 0 || batchImportMutation.isPending}
            className="flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            {batchImportMutation.isPending 
              ? "Importing..." 
              : `Import ${validPersonas.length} Character${validPersonas.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
    </div>
  );
}