import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  InsertPersona, 
  InsertPersonaCategory, 
  InsertConcept, 
  InsertConceptCategory 
} from "@shared/schema";
import BatchImportDialog from "@/components/BatchImportDialog";
import { getLanguage, loadTranslations, setLanguage, t } from "@/lib/i18n";
import { getLanguages, uploadTranslations } from "@/lib/api";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Edit, PlusCircle, Trash2, X, Download, Upload, Globe } from "lucide-react";

// Define form validation schemas using Zod
const personaFormSchema = z.object({
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

const categoryFormSchema = z.object({
  categoryId: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  emoji: z.string().min(1, "Emoji is required"),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// Define validation schemas for concept management
const conceptCategorySchema = z.object({
  categoryId: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const conceptSchema = z.object({
  conceptId: z.string().min(1, "ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  promptTemplate: z.string().min(1, "Prompt template is required"),
  thumbnailUrl: z.string().optional(),
  tagSuggestions: z.array(z.string()).optional().default([]),
  variables: z.array(z.object({
    name: z.string().min(1, "Variable name is required"),
    description: z.string().min(1, "Variable description is required"),
    type: z.enum(["text", "select", "number", "boolean"]),
    required: z.boolean().default(true),
    options: z.array(z.string()).optional(),
    defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })).optional().default([]),
  categoryId: z.string().min(1, "Category is required"),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
});

// Main admin component
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("personas");
  
  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-6">{t('admin.title')}</h1>
      <p className="text-gray-500 mb-8">
        {t('admin.subtitle')}
      </p>
      
      <Tabs defaultValue="personas" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap mb-8">
          <TabsTrigger value="personas">{t('admin.tabs.personas')}</TabsTrigger>
          <TabsTrigger value="categories">{t('admin.tabs.categories')}</TabsTrigger>
          <TabsTrigger value="concepts">{t('admin.tabs.concepts')}</TabsTrigger>
          <TabsTrigger value="concept-categories">{t('admin.tabs.conceptCategories')}</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personas">
          <PersonaManager />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
        
        <TabsContent value="concepts">
          <ConceptManager />
        </TabsContent>
        
        <TabsContent value="concept-categories">
          <ConceptCategoryManager />
        </TabsContent>
        
        <TabsContent value="languages">
          <LanguageSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// PersonaManager component for managing chat characters
function PersonaManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<InsertPersona | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch personas
  const { data: personas, isLoading, error } = useQuery({
    queryKey: ["/api/admin/personas"],
  });
  
  // Fetch categories for select dropdown
  const { data: categories } = useQuery({
    queryKey: ["/api/admin/categories"],
  });
  
  // Handler for editing a persona
  const handleEditPersona = (persona: InsertPersona) => {
    setEditingPersona(persona);
    setIsEditDialogOpen(true);
  };
  
  // Delete persona mutation
  const deletePersonaMutation = useMutation({
    mutationFn: (personaId: string) => apiRequest(`/api/admin/personas/${personaId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      toast({
        title: "Character deleted",
        description: "The character has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete character. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting persona:", error);
    },
  });
  
  // Handler for deleting a persona
  const handleDeletePersona = (personaId: string) => {
    if (window.confirm("Are you sure you want to delete this character? This action cannot be undone.")) {
      deletePersonaMutation.mutate(personaId);
    }
  };
  
  // Toggle persona active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ personaId, isActive }: { personaId: string; isActive: boolean }) => {
      const persona = personas.find(p => p.personaId === personaId);
      return apiRequest(`/api/admin/personas/${personaId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...persona,
          isActive,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update character status. Please try again.",
        variant: "destructive",
      });
      console.error("Error toggling persona status:", error);
    },
  });
  
  // Toggle featured status mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ personaId, isFeatured }: { personaId: string; isFeatured: boolean }) => {
      const persona = personas.find(p => p.personaId === personaId);
      return apiRequest(`/api/admin/personas/${personaId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...persona,
          isFeatured,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update featured status. Please try again.",
        variant: "destructive",
      });
      console.error("Error toggling featured status:", error);
    },
  });
  
  if (isLoading) {
    return <div className="text-center py-10">Loading characters...</div>;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error loading characters. Please refresh the page.</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Chat Characters</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBatchImportOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Batch Import
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Character
          </Button>
        </div>
      </div>
      
      {personas && personas.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Character</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personas.map((persona) => (
                <TableRow key={persona.personaId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{persona.avatarEmoji}</span>
                      <div>
                        <div>{persona.name}</div>
                        <div className="text-xs text-gray-500">{persona.description.substring(0, 50)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {persona.categories && Array.isArray(persona.categories) && persona.categories.map((categoryId) => {
                        const category = categories?.find(c => c.categoryId === categoryId);
                        return category ? (
                          <Badge key={categoryId} variant="outline" className="text-xs">
                            {category.emoji} {category.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {persona.timeOfDay}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={persona.isActive} 
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ personaId: persona.personaId, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={persona.isFeatured} 
                      onCheckedChange={(checked) => 
                        toggleFeaturedMutation.mutate({ personaId: persona.personaId, isFeatured: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditPersona(persona)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePersona(persona.personaId)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No characters found. Create your first character!</p>
        </div>
      )}
      
      {/* Create Persona Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Character</DialogTitle>
            <DialogDescription>
              Add a new AI chat character to your system.
            </DialogDescription>
          </DialogHeader>
          
          <PersonaForm 
            categories={categories || []} 
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Persona Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Character</DialogTitle>
            <DialogDescription>
              Modify this AI chat character's details.
            </DialogDescription>
          </DialogHeader>
          
          {editingPersona && (
            <PersonaForm 
              categories={categories || []} 
              initialData={editingPersona}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Import Dialog */}
      <Dialog open={isBatchImportOpen} onOpenChange={setIsBatchImportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Import Characters</DialogTitle>
            <DialogDescription>
              Import multiple characters from JSON format.
            </DialogDescription>
          </DialogHeader>
          
          {isBatchImportOpen && (
            <BatchImportDialog 
              onSuccess={() => {
                setIsBatchImportOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
              }}
              categories={categories || []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Form component for creating/editing personas
interface PersonaFormProps {
  initialData?: InsertPersona;
  categories: InsertPersonaCategory[];
  onSuccess: () => void;
}

function PersonaForm({ initialData, categories, onSuccess }: PersonaFormProps) {
  const queryClient = useQueryClient();
  const [emotionalKeyword, setEmotionalKeyword] = useState("");
  
  // Set up form
  const form = useForm<z.infer<typeof personaFormSchema>>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: initialData || {
      personaId: "",
      name: "",
      avatarEmoji: "😊",
      description: "",
      welcomeMessage: "",
      systemPrompt: "",
      primaryColor: "#7c3aed",
      secondaryColor: "#ddd6fe",
      personality: "",
      tone: "",
      usageContext: "",
      emotionalKeywords: [],
      timeOfDay: "all",
      isActive: true,
      isFeatured: false,
      order: 0,
      categories: [],
    },
  });
  
  // Create/update persona mutation
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof personaFormSchema>) => {
      if (initialData) {
        // Update existing persona
        return apiRequest(`/api/admin/personas/${initialData.personaId}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
      } else {
        // Create new persona
        return apiRequest("/api/admin/personas", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: initialData ? "Character updated" : "Character created",
        description: initialData 
          ? "The character has been updated successfully." 
          : "The new character has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: initialData 
          ? "Failed to update character. Please try again." 
          : "Failed to create character. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving persona:", error);
    },
  });
  
  // Submit handler
  function onSubmit(values: z.infer<typeof personaFormSchema>) {
    mutation.mutate(values);
  }
  
  // Add emotional keyword
  const addEmotionalKeyword = () => {
    if (emotionalKeyword.trim() && !form.getValues("emotionalKeywords")?.includes(emotionalKeyword.trim())) {
      const currentKeywords = form.getValues("emotionalKeywords") || [];
      form.setValue("emotionalKeywords", [...currentKeywords, emotionalKeyword.trim()]);
      setEmotionalKeyword("");
    }
  };
  
  // Remove emotional keyword
  const removeEmotionalKeyword = (keyword: string) => {
    const currentKeywords = form.getValues("emotionalKeywords") || [];
    form.setValue(
      "emotionalKeywords", 
      currentKeywords.filter(k => k !== keyword)
    );
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Basic info */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="personaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="unique-id" 
                        {...field} 
                        disabled={!!initialData}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Character name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="avatarEmoji"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar Emoji</FormLabel>
                    <FormControl>
                      <Input placeholder="Emoji" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Short description of this character" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Messages & prompts */}
            <div className="space-y-4 pt-4">
              <h3 className="text-md font-semibold">Messages & Prompts</h3>
              
              <FormField
                control={form.control}
                name="welcomeMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Message shown when this character is selected" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Instructions for AI on how to behave as this character" 
                        className="resize-none h-40" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Right column */}
          <div className="space-y-4">
            {/* Colors */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Theme Colors</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <Input 
                            type="color" 
                            className="w-12 h-10 p-1 mr-2" 
                            {...field} 
                          />
                          <Input 
                            type="text" 
                            placeholder="#000000" 
                            value={field.value} 
                            onChange={field.onChange}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <Input 
                            type="color" 
                            className="w-12 h-10 p-1 mr-2" 
                            {...field} 
                          />
                          <Input 
                            type="text" 
                            placeholder="#000000" 
                            value={field.value} 
                            onChange={field.onChange}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Character attributes */}
            <div className="space-y-4 pt-4">
              <h3 className="text-md font-semibold">Character Attributes</h3>
              
              <FormField
                control={form.control}
                name="personality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personality</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Warm, empathetic, gentle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Reassuring and calm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="usageContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usage Context</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., For moms struggling emotionally after birth" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emotionalKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emotional Keywords</FormLabel>
                    <div className="flex mb-2">
                      <Input 
                        placeholder="e.g., anxious, overwhelmed" 
                        value={emotionalKeyword}
                        onChange={(e) => setEmotionalKeyword(e.target.value)}
                        className="mr-2"
                      />
                      <Button 
                        type="button"
                        onClick={addEmotionalKeyword}
                        variant="outline"
                        disabled={!emotionalKeyword.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.watch("emotionalKeywords")?.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                          {keyword}
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => removeEmotionalKeyword(keyword)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="timeOfDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time of Day Relevance</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time of day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="all">All Day</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Categories */}
            <div className="space-y-4 pt-4">
              <h3 className="text-md font-semibold">Categories & Admin</h3>
              
              <FormField
                control={form.control}
                name="categories"
                render={() => (
                  <FormItem>
                    <FormLabel>Categories</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {categories.map((category) => (
                        <FormField
                          key={category.categoryId}
                          control={form.control}
                          name="categories"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={category.categoryId}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={(field.value || []).includes(category.categoryId)}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || [];
                                      if (checked) {
                                        form.setValue("categories", [
                                          ...currentValues,
                                          category.categoryId,
                                        ]);
                                      } else {
                                        form.setValue(
                                          "categories",
                                          currentValues.filter(
                                            (value) => value !== category.categoryId
                                          )
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {category.emoji} {category.name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription className="text-xs">
                          Show in user interface
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription className="text-xs">
                          Promote to users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              "Saving..."
            ) : initialData ? (
              "Update Character"
            ) : (
              "Create Character"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// CategoryManager component for managing categories
function CategoryManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InsertPersonaCategory | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch categories
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["/api/admin/categories"],
  });
  
  // Handler for editing a category
  const handleEditCategory = (category: InsertPersonaCategory) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };
  
  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => apiRequest(`/api/admin/categories/${categoryId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting category:", error);
    },
  });
  
  // Handler for deleting a category
  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm("Are you sure you want to delete this category? This may affect characters assigned to it.")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };
  
  // Toggle category active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => {
      const category = categories.find(c => c.categoryId === categoryId);
      return apiRequest(`/api/admin/categories/${categoryId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...category,
          isActive,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update category status. Please try again.",
        variant: "destructive",
      });
      console.error("Error toggling category status:", error);
    },
  });
  
  if (isLoading) {
    return <div className="text-center py-10">Loading categories...</div>;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error loading categories. Please refresh the page.</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Category
        </Button>
      </div>
      
      {categories && categories.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.categoryId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{category.emoji}</span>
                      <div>{category.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell>{category.order}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={category.isActive} 
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ categoryId: category.categoryId, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.categoryId)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No categories found. Create your first category!</p>
        </div>
      )}
      
      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category for organizing chat characters.
            </DialogDescription>
          </DialogHeader>
          
          <CategoryForm 
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Modify this category's details.
            </DialogDescription>
          </DialogHeader>
          
          {editingCategory && (
            <CategoryForm 
              initialData={editingCategory}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Form component for creating/editing categories
interface CategoryFormProps {
  initialData?: InsertPersonaCategory;
  onSuccess: () => void;
}

function CategoryForm({ initialData, onSuccess }: CategoryFormProps) {
  const queryClient = useQueryClient();
  
  // Set up form
  const form = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData || {
      categoryId: "",
      name: "",
      description: "",
      emoji: "✨",
      order: 0,
      isActive: true,
    },
  });
  
  // Create/update category mutation
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof categoryFormSchema>) => {
      if (initialData) {
        // Update existing category
        return apiRequest(`/api/admin/categories/${initialData.categoryId}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
      } else {
        // Create new category
        return apiRequest("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: initialData ? "Category updated" : "Category created",
        description: initialData 
          ? "The category has been updated successfully." 
          : "The new category has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: initialData 
          ? "Failed to update category. Please try again." 
          : "Failed to create category. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving category:", error);
    },
  });
  
  // Submit handler
  function onSubmit(values: z.infer<typeof categoryFormSchema>) {
    mutation.mutate(values);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID</FormLabel>
              <FormControl>
                <Input 
                  placeholder="unique-id" 
                  {...field} 
                  disabled={!!initialData}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Category name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Short description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="emoji"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emoji</FormLabel>
              <FormControl>
                <Input placeholder="Category emoji" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Order</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <FormDescription className="text-xs">
                    Show in user interface
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              "Saving..."
            ) : initialData ? (
              "Update Category"
            ) : (
              "Create Category"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
// ConceptCategoryManager component
function ConceptCategoryManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InsertConceptCategory | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch concept categories
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["/api/admin/concept-categories"],
  });
  
  // Handler for editing a category
  const handleEditCategory = (category: InsertConceptCategory) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };
  
  // Delete concept category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => apiRequest(`/api/admin/concept-categories/${categoryId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "The image concept category has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/concept-categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting concept category:", error);
    },
  });
  
  // Handler for deleting a category
  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm("Are you sure you want to delete this category? This action cannot be undone and may affect associated concepts.")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };
  
  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => {
      const category = categories.find((c: any) => c.categoryId === categoryId);
      return apiRequest(`/api/admin/concept-categories/${categoryId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...category,
          isActive,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/concept-categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update category status. Please try again.",
        variant: "destructive",
      });
      console.error("Error toggling category status:", error);
    },
  });
  
  if (isLoading) {
    return <div className="text-center py-10">Loading concept categories...</div>;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error loading concept categories. Please refresh the page.</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Image Generation Categories</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Category
        </Button>
      </div>
      
      {categories && categories.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category: any) => (
                <TableRow key={category.categoryId}>
                  <TableCell className="font-medium">
                    {category.name}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {category.description}
                  </TableCell>
                  <TableCell>{category.order}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={category.isActive} 
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ categoryId: category.categoryId, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.categoryId)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No concept categories found. Create your first category!</p>
        </div>
      )}
      
      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Concept Category</DialogTitle>
            <DialogDescription>
              Add a new category for AI image generation concepts.
            </DialogDescription>
          </DialogHeader>
          
          <ConceptCategoryForm 
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/admin/concept-categories"] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Concept Category</DialogTitle>
            <DialogDescription>
              Modify this concept category's details.
            </DialogDescription>
          </DialogHeader>
          
          {editingCategory && (
            <ConceptCategoryForm 
              initialData={editingCategory}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/admin/concept-categories"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Form component for creating/editing concept categories
interface ConceptCategoryFormProps {
  initialData?: InsertConceptCategory;
  onSuccess: () => void;
}

function ConceptCategoryForm({ initialData, onSuccess }: ConceptCategoryFormProps) {
  const queryClient = useQueryClient();
  
  // Set up form
  const form = useForm({
    resolver: zodResolver(conceptCategorySchema),
    defaultValues: initialData || {
      categoryId: "",
      name: "",
      description: "",
      order: 0,
      isActive: true,
    },
  });
  
  // Create/update mutation
  const submitMutation = useMutation({
    mutationFn: (values: z.infer<typeof conceptCategorySchema>) => {
      if (initialData) {
        return apiRequest(`/api/admin/concept-categories/${initialData.categoryId}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
      } else {
        return apiRequest("/api/admin/concept-categories", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: initialData ? "Category updated" : "Category created",
        description: initialData ? 
          "The concept category has been updated successfully" : 
          "The concept category has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/concept-categories"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${initialData ? 'update' : 'create'} concept category. Please try again.`,
        variant: "destructive",
      });
      console.error(`Error ${initialData ? 'updating' : 'creating'} concept category:`, error);
    },
  });
  
  function onSubmit(values: z.infer<typeof conceptCategorySchema>) {
    submitMutation.mutate(values);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category ID</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="unique-id" 
                    {...field} 
                    disabled={!!initialData}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Category name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Order</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active</FormLabel>
                  <p className="text-sm text-gray-500">
                    Enable or disable this category
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe this concept category" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-2 justify-end">
          <Button type="submit" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {initialData ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>{initialData ? "Update" : "Create"} Category</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ConceptManager component for managing image generation concepts
function ConceptManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<InsertConcept | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch concepts
  const { data: concepts, isLoading, error } = useQuery({
    queryKey: ["/api/admin/concepts"],
  });
  
  // Fetch concept categories for select dropdown
  const { data: categories } = useQuery({
    queryKey: ["/api/admin/concept-categories"],
  });
  
  // Handler for editing a concept
  const handleEditConcept = (concept: InsertConcept) => {
    setEditingConcept(concept);
    setIsEditDialogOpen(true);
  };
  
  // Delete concept mutation
  const deleteConceptMutation = useMutation({
    mutationFn: (conceptId: string) => apiRequest(`/api/admin/concepts/${conceptId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      toast({
        title: "Concept deleted",
        description: "The concept has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/concepts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete concept. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting concept:", error);
    },
  });
  
  // Handler for deleting a concept
  const handleDeleteConcept = (conceptId: string) => {
    if (window.confirm("Are you sure you want to delete this concept? This action cannot be undone.")) {
      deleteConceptMutation.mutate(conceptId);
    }
  };
  
  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ conceptId, isActive }: { conceptId: string; isActive: boolean }) => {
      const concept = concepts.find((c: any) => c.conceptId === conceptId);
      return apiRequest(`/api/admin/concepts/${conceptId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...concept,
          isActive,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/concepts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update concept status. Please try again.",
        variant: "destructive",
      });
      console.error("Error toggling concept status:", error);
    },
  });
  
  // Toggle featured status mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ conceptId, isFeatured }: { conceptId: string; isFeatured: boolean }) => {
      const concept = concepts.find((c: any) => c.conceptId === conceptId);
      return apiRequest(`/api/admin/concepts/${conceptId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...concept,
          isFeatured,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/concepts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update featured status. Please try again.",
        variant: "destructive",
      });
      console.error("Error toggling featured status:", error);
    },
  });
  
  // A/B Test tab state
  const [abTestTabActive, setAbTestTabActive] = useState(false);
  
  if (isLoading) {
    return <div className="text-center py-10">Loading concepts...</div>;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error loading concepts. Please refresh the page.</div>;
  }
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Image Generation Concepts</h2>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
          <Tabs value={abTestTabActive ? "ab-test" : "concepts"} onValueChange={(val) => setAbTestTabActive(val === "ab-test")} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="concepts">Concepts</TabsTrigger>
              <TabsTrigger value="ab-test">A/B Testing</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Concept
          </Button>
        </div>
      </div>
      
      {abTestTabActive ? (
        <Card className="py-12">
          <div className="text-center flex flex-col items-center justify-center gap-4 px-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
              <PlusCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold">Coming Soon: A/B Testing For Image Prompts</h3>
            <p className="text-gray-500 max-w-xl">
              Track image performance by prompt variation. Compare different prompts for the same concept and see which performs better with your users.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
              <div className="border border-dashed rounded-lg p-4 bg-gray-50">
                <p className="font-medium mb-2">Prompt A</p>
                <p className="text-sm text-gray-500">Compare performance metrics for different prompt variations</p>
              </div>
              <div className="border border-dashed rounded-lg p-4 bg-gray-50">
                <p className="font-medium mb-2">Prompt B</p>
                <p className="text-sm text-gray-500">See which prompt generates images that users prefer</p>
              </div>
            </div>
          </div>
        </Card>
      ) : concepts && concepts.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concepts.map((concept: any) => {
                const category = categories?.find((c: any) => c.categoryId === concept.categoryId);
                
                return (
                  <TableRow key={concept.conceptId}>
                    <TableCell className="font-medium">
                      <div className="flex items-start space-x-2">
                        {concept.thumbnailUrl ? (
                          <div className="group relative">
                            <img 
                              src={concept.thumbnailUrl} 
                              alt={concept.title} 
                              className="w-10 h-10 rounded object-cover cursor-pointer"
                            />
                            <div className="absolute left-0 -top-24 transform scale-0 group-hover:scale-100 transition-transform origin-bottom z-50 pointer-events-none">
                              <img 
                                src={concept.thumbnailUrl} 
                                alt={concept.title} 
                                className="w-40 h-40 rounded-md object-cover shadow-lg"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No img</span>
                          </div>
                        )}
                        <div>
                          <div>{concept.title}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{concept.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {category ? category.name : concept.categoryId}
                    </TableCell>
                    <TableCell>
                      {concept.variables && Array.isArray(concept.variables) ? (
                        <Badge variant="outline">{concept.variables.length} vars</Badge>
                      ) : (
                        <Badge variant="outline">0 vars</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={concept.isActive} 
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ conceptId: concept.conceptId, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={concept.isFeatured} 
                        onCheckedChange={(checked) => 
                          toggleFeaturedMutation.mutate({ conceptId: concept.conceptId, isFeatured: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditConcept(concept)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteConcept(concept.conceptId)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No concepts found. Create your first concept!</p>
        </div>
      )}
      
      {/* Create Concept Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Concept</DialogTitle>
            <DialogDescription>
              Add a new AI image generation concept.
            </DialogDescription>
          </DialogHeader>
          
          <ConceptForm 
            categories={categories || []} 
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/admin/concepts"] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Concept Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Concept</DialogTitle>
            <DialogDescription>
              Modify this concept's details.
            </DialogDescription>
          </DialogHeader>
          
          {editingConcept && (
            <ConceptForm 
              categories={categories || []} 
              initialData={editingConcept}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/admin/concepts"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Form component for creating/editing concepts
interface ConceptFormProps {
  initialData?: InsertConcept;
  categories: any[];
  onSuccess: () => void;
}

function ConceptForm({ initialData, categories, onSuccess }: ConceptFormProps) {
  const queryClient = useQueryClient();
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [editingVariableIndex, setEditingVariableIndex] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewValues, setPreviewValues] = useState<{[key: string]: string}>({});
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialData?.thumbnailUrl || null);
  
  // Set up form
  const form = useForm({
    resolver: zodResolver(conceptSchema),
    defaultValues: initialData || {
      conceptId: "",
      title: "",
      description: "",
      promptTemplate: "",
      thumbnailUrl: "",
      tagSuggestions: [],
      variables: [],
      categoryId: "",
      isActive: true,
      isFeatured: false,
      order: 0,
    },
  });
  
  // Watch form values for prompt preview
  const promptTemplate = form.watch("promptTemplate");
  const variables = form.watch("variables") || [];
  
  // Extract variable names from the prompt template
  const extractVariables = (template: string) => {
    const regex = /\{([^{}]+)\}/g;
    const matches = template.match(regex) || [];
    return matches.map(match => match.slice(1, -1).trim());
  };
  
  const promptVariables = extractVariables(promptTemplate);
  
  const sampleValues: {[key: string]: string} = {
    baby_name: "Minjun",
    mother_name: "Jiyoung",
    father_name: "Sungho",
    birth_month: "May",
    birth_year: "2024",
    pregnancy_week: "28",
    gender: "boy",
    zodiac_sign: "Taurus",
    nickname: "Little Dragon",
    taemyeong: "하늘이", // Korean nickname for unborn baby
    color: "pastel blue",
    season: "spring",
    emotion: "joyful",
    animal: "rabbit"
  };
  
  // Update preview values when variables change
  useEffect(() => {
    const newPreviewValues: {[key: string]: string} = {};
    promptVariables.forEach(varName => {
      // First check if we have a sample value
      if (sampleValues[varName]) {
        newPreviewValues[varName] = sampleValues[varName];
        return;
      }
      
      // Find the variable in the variables array
      const varDef = variables.find((v: any) => v.name === varName);
      
      // Set default preview value based on variable type
      if (varDef) {
        if (varDef.defaultValue !== undefined) {
          newPreviewValues[varName] = String(varDef.defaultValue);
        } else if (varDef.type === 'select' && varDef.options && varDef.options.length > 0) {
          newPreviewValues[varName] = varDef.options[0];
        } else if (varDef.type === 'number') {
          newPreviewValues[varName] = '5';
        } else if (varDef.type === 'boolean') {
          newPreviewValues[varName] = 'true';
        } else {
          newPreviewValues[varName] = `[${varName}]`;
        }
      } else {
        // For variables not defined yet, try to use a sample value or a placeholder
        newPreviewValues[varName] = `[${varName}]`;
      }
    });
    
    setPreviewValues(newPreviewValues);
  }, [promptTemplate, variables]);
  
  // Generate prompt preview with replaced variables
  const getPromptPreview = () => {
    let preview = promptTemplate;
    
    Object.entries(previewValues).forEach(([varName, value]) => {
      preview = preview.replace(new RegExp(`\\{\\s*${varName}\\s*\\}`, 'g'), value);
    });
    
    return preview;
  };
  
  // Handle thumbnail image upload
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingThumbnail(true);
    
    try {
      const formData = new FormData();
      formData.append("thumbnail", file);
      
      const response = await fetch("/api/admin/upload/thumbnail", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload thumbnail");
      }
      
      const data = await response.json();
      setThumbnailUrl(data.url);
      form.setValue("thumbnailUrl", data.url);
      
      toast({
        title: "Thumbnail uploaded",
        description: "The thumbnail has been uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload thumbnail image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingThumbnail(false);
    }
  };
  
  // Create/update mutation
  const submitMutation = useMutation({
    mutationFn: (values: z.infer<typeof conceptSchema>) => {
      if (initialData) {
        return apiRequest(`/api/admin/concepts/${initialData.conceptId}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
      } else {
        return apiRequest("/api/admin/concepts", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: initialData ? "Concept updated" : "Concept created",
        description: initialData ? 
          "The concept has been updated successfully" : 
          "The concept has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/concepts"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${initialData ? 'update' : 'create'} concept. Please try again.`,
        variant: "destructive",
      });
      console.error(`Error ${initialData ? 'updating' : 'creating'} concept:`, error);
    },
  });
  
  function onSubmit(values: z.infer<typeof conceptSchema>) {
    submitMutation.mutate(values);
  }
  
  // Update variable form values and add missing variable definitions
  useEffect(() => {
    // For each variable found in the prompt
    promptVariables.forEach(varName => {
      // Check if it exists in the current variables array
      const exists = variables.some((v: any) => v.name === varName);
      
      // If it doesn't exist, add it as a new variable
      if (!exists) {
        const newVariables = [...variables];
        newVariables.push({
          name: varName,
          description: `Description for ${varName}`,
          type: "text",
          required: true
        });
        form.setValue("variables", newVariables);
      }
    });
  }, [promptTemplate]);
  
  // Handle variable preview value change
  const handlePreviewValueChange = (varName: string, value: string) => {
    setPreviewValues({
      ...previewValues,
      [varName]: value
    });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="conceptId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Concept ID</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="unique-id" 
                    {...field} 
                    disabled={!!initialData}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Concept name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category: any) => (
                      <SelectItem key={category.categoryId} value={category.categoryId}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="thumbnailUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thumbnail URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://example.com/image.jpg" 
                    {...field} 
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Order</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex-1 flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <p className="text-sm text-gray-500">
                      Enable or disable this concept
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex-1 flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Featured</FormLabel>
                    <p className="text-sm text-gray-500">
                      Show in featured section
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe this concept" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="promptTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prompt Template</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Create a watercolor style image of {{object}} with {{style_details}}" 
                  className="min-h-32" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Use double curly braces <code className="bg-gray-100 px-1 rounded">{'{{variable_name}}'}</code> to define variables that will be replaced.
                Variables will be automatically added to the variables list below.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Prompt Preview Section */}
        {promptTemplate && (
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Prompt Preview</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewVisible(!previewVisible)}>
                {previewVisible ? "Hide Preview" : "Show Preview"}
              </Button>
            </div>
            
            {previewVisible && (
              <>
                <div className="border bg-white rounded-md p-3 mb-3">
                  <p className="whitespace-pre-wrap">{getPromptPreview()}</p>
                </div>
                
                {promptVariables.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Customize Preview Values:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {promptVariables.map(varName => {
                        const varDef = variables.find((v: any) => v.name === varName);
                        
                        return (
                          <div key={varName} className="flex items-center gap-2">
                            <span className="text-sm font-medium min-w-24">{varName}:</span>
                            {varDef && varDef.type === 'select' ? (
                              <select 
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                value={previewValues[varName] || ''}
                                onChange={(e) => handlePreviewValueChange(varName, e.target.value)}
                              >
                                {(varDef.options || []).map((option: string) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : varDef && varDef.type === 'boolean' ? (
                              <select 
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                value={previewValues[varName] || 'true'}
                                onChange={(e) => handlePreviewValueChange(varName, e.target.value)}
                              >
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            ) : (
                              <input 
                                type={varDef && varDef.type === 'number' ? 'number' : 'text'}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                value={previewValues[varName] || ''}
                                onChange={(e) => handlePreviewValueChange(varName, e.target.value)}
                                placeholder={`Value for ${varName}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <FormLabel>Variables</FormLabel>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => {
                setEditingVariableIndex(null);
                setVariableDialogOpen(true);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          </div>
          
          {variables.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Used in Prompt</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variables.map((variable: any, index: number) => {
                    const isUsedInPrompt = promptVariables.includes(variable.name);
                    
                    return (
                      <TableRow key={index} className={!isUsedInPrompt ? "bg-gray-50" : ""}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{variable.name}</div>
                            <div className="text-xs text-gray-500">{variable.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{variable.type}</Badge>
                          {variable.type === 'select' && variable.options?.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {variable.options.length} options
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {variable.required ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : 
                            <X className="h-4 w-4 text-gray-300" />
                          }
                        </TableCell>
                        <TableCell>
                          {isUsedInPrompt ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : 
                            <Badge variant="outline" className="text-yellow-600 bg-yellow-50">Unused</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setEditingVariableIndex(index);
                                setVariableDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                const newVariables = [...variables];
                                newVariables.splice(index, 1);
                                form.setValue("variables", newVariables);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed rounded-md text-gray-500">
              No variables defined. Add variables to make your concept customizable.
            </div>
          )}
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button type="submit" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {initialData ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>{initialData ? "Update" : "Create"} Concept</>
            )}
          </Button>
        </div>
      </form>
      
      {/* Variable Dialog */}
      <Dialog open={variableDialogOpen} onOpenChange={setVariableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariableIndex !== null ? "Edit Variable" : "Add Variable"}
            </DialogTitle>
            <DialogDescription>
              Define a variable for the prompt template.
            </DialogDescription>
          </DialogHeader>
          
          <VariableForm 
            initialData={editingVariableIndex !== null ? variables[editingVariableIndex] : undefined}
            onSave={(variable) => {
              const newVariables = [...variables];
              if (editingVariableIndex !== null) {
                newVariables[editingVariableIndex] = variable;
              } else {
                newVariables.push(variable);
              }
              form.setValue("variables", newVariables);
              setVariableDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </Form>
  );
}

// Form for variable editing
interface VariableFormProps {
  initialData?: any;
  onSave: (variable: any) => void;
}

function VariableForm({ initialData, onSave }: VariableFormProps) {
  const variableForm = useForm({
    defaultValues: initialData || {
      name: "",
      description: "",
      type: "text",
      required: true,
      options: [],
      defaultValue: ""
    }
  });
  
  const variableType = variableForm.watch("type");
  const [newOption, setNewOption] = useState("");
  
  function handleSubmit(values: any) {
    // For select type, ensure options array is available
    if (values.type === "select" && (!values.options || !Array.isArray(values.options))) {
      values.options = [];
    }
    
    // Convert defaultValue to the appropriate type
    if (values.type === "number" && values.defaultValue !== undefined) {
      values.defaultValue = Number(values.defaultValue);
    } else if (values.type === "boolean" && values.defaultValue !== undefined) {
      values.defaultValue = values.defaultValue === "true";
    }
    
    onSave(values);
  }
  
  return (
    <form onSubmit={variableForm.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input 
            placeholder="variable_name" 
            {...variableForm.register("name", { required: true })}
          />
          {variableForm.formState.errors.name && (
            <p className="text-red-500 text-xs">Name is required</p>
          )}
          <p className="text-xs text-gray-500">
            Use only letters, numbers, and underscores (e.g., baby_name, bg_color)
          </p>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            {...variableForm.register("type")}
          >
            <option value="text">Text</option>
            <option value="select">Select (Dropdown)</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean (Yes/No)</option>
          </select>
          <p className="text-xs text-gray-500">
            Controls how users will input this value
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input 
          placeholder="Describe what this variable is for" 
          {...variableForm.register("description", { required: true })}
        />
        {variableForm.formState.errors.description && (
          <p className="text-red-500 text-xs">Description is required</p>
        )}
        <p className="text-xs text-gray-500">
          This will be shown to users as a tooltip or helper text
        </p>
      </div>
      
      {variableType === "select" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Options</label>
          <div className="flex space-x-2">
            <Input 
              placeholder="New option" 
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
            />
            <Button 
              type="button"
              onClick={() => {
                if (newOption.trim()) {
                  const currentOptions = variableForm.getValues("options") || [];
                  variableForm.setValue("options", [...currentOptions, newOption.trim()]);
                  setNewOption("");
                }
              }}
            >
              Add
            </Button>
          </div>
          
          <div className="border rounded-md p-2 min-h-[100px] space-y-1">
            {(variableForm.watch("options") || []).map((option: string, index: number) => (
              <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <span>{option}</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const currentOptions = variableForm.getValues("options") || [];
                    variableForm.setValue(
                      "options", 
                      currentOptions.filter((_, i) => i !== index)
                    );
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {(!variableForm.watch("options") || variableForm.watch("options").length === 0) && (
              <p className="text-gray-400 text-center py-2">No options added yet</p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Users will select from these options in a dropdown menu
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Default Value</label>
        {variableType === "text" && (
          <Input 
            placeholder="Default text" 
            {...variableForm.register("defaultValue")}
          />
        )}
        {variableType === "number" && (
          <Input 
            type="number" 
            placeholder="0" 
            {...variableForm.register("defaultValue")}
          />
        )}
        {variableType === "select" && (
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            {...variableForm.register("defaultValue")}
          >
            <option value="">Select a default option</option>
            {(variableForm.watch("options") || []).map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        {variableType === "boolean" && (
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            {...variableForm.register("defaultValue")}
          >
            <option value="">No default</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        )}
        <p className="text-xs text-gray-500">
          Optional pre-filled value for this variable
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="required"
          checked={variableForm.watch("required")}
          onCheckedChange={(checked) => 
            variableForm.setValue("required", checked === true)
          }
        />
        <label 
          htmlFor="required"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Required field
        </label>
      </div>
      
      <DialogFooter>
        <Button type="submit">Save Variable</Button>
      </DialogFooter>
    </form>
  );
}

// Language Settings component
function LanguageSettings() {
  const [currentLanguage, setCurrentLanguage] = useState(getLanguage());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  
  // Fetch available languages
  const { data: languages, isLoading } = useQuery({
    queryKey: ["/api/languages"],
    queryFn: getLanguages
  });
  
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCurrentLanguage(lang);
    toast({
      title: "Language Changed",
      description: `Application language has been changed to ${lang.toUpperCase()}`,
    });
  };
  
  const handleOpenUploadDialog = (lang: string) => {
    setSelectedLanguage(lang);
    setUploadDialogOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Language Settings</h2>
      </div>
      
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Current Language</h3>
          <p>The application is currently displayed in <strong>{currentLanguage.toUpperCase()}</strong></p>
          
          <div className="flex gap-2 mt-4">
            {!isLoading && languages?.map((lang: any) => (
              <Button 
                key={lang.code}
                variant={currentLanguage === lang.code ? "default" : "outline"}
                onClick={() => handleLanguageChange(lang.code)}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                {lang.name}
                {lang.isDefault && <Badge variant="outline" className="ml-1">Default</Badge>}
              </Button>
            ))}
          </div>
        </div>
        
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertTitle>Translation Management</AlertTitle>
          <AlertDescription>
            Upload translation files for different languages.
            Each file should be a JSON object with translation keys and their corresponding texts.
          </AlertDescription>
        </Alert>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Upload Translations</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && languages?.map((lang: any) => (
                <TableRow key={lang.code}>
                  <TableCell>{lang.name} ({lang.code})</TableCell>
                  <TableCell>
                    {lang.isDefault ? (
                      <Badge variant="outline" className="bg-green-50">Default Source</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50">Needs Translation</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenUploadDialog(lang.code)}
                      disabled={lang.isDefault}
                      className="flex items-center gap-1"
                    >
                      <Upload className="h-4 w-4" />
                      Upload
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Translations</DialogTitle>
            <DialogDescription>
              Upload translations for {selectedLanguage?.toUpperCase()}. 
              The file should be a JSON object with translation keys and their corresponding texts.
            </DialogDescription>
          </DialogHeader>
          
          <TranslationUploadForm 
            language={selectedLanguage || ""}
            onSuccess={() => setUploadDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Translation Upload Form
interface TranslationUploadFormProps {
  language: string;
  onSuccess: () => void;
}

function TranslationUploadForm({ language, onSuccess }: TranslationUploadFormProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedTranslations, setParsedTranslations] = useState<Record<string, string> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!parsedTranslations) return Promise.reject("No translations to upload");
      return uploadTranslations(language, parsedTranslations);
    },
    onSuccess: (response) => {
      toast({
        title: "Translations Uploaded",
        description: `Successfully uploaded ${response.count} translations for ${language.toUpperCase()}`,
      });
      
      // Load translations into the app
      if (parsedTranslations) {
        loadTranslations(language, parsedTranslations);
      }
      
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: String(error),
        variant: "destructive"
      });
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setParseError(null);
    setParsedTranslations(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setFileContent(content);
        
        // Try to parse as JSON
        const parsed = JSON.parse(content);
        
        // Validate it's a flat object with string values
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
          throw new Error("Translation file must be a JSON object with key-value pairs");
        }
        
        // Check all values are strings
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value !== 'string') {
            throw new Error(`Value for key "${key}" is not a string`);
          }
        }
        
        setParsedTranslations(parsed);
      } catch (err) {
        console.error("Error parsing translations file:", err);
        setParseError(err instanceof Error ? err.message : "Unknown error parsing JSON");
      }
    };
    
    reader.readAsText(file);
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Translation File (JSON)</label>
        <Input 
          type="file" 
          accept=".json" 
          onChange={handleFileChange} 
        />
        <p className="text-xs text-gray-500">
          Upload a JSON file containing translations for {language.toUpperCase()}
        </p>
      </div>
      
      {parseError && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error Parsing File</AlertTitle>
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}
      
      {parsedTranslations && (
        <div>
          <h3 className="text-sm font-medium mb-2">Preview</h3>
          <div className="max-h-64 overflow-y-auto border rounded-md p-4">
            <p className="text-sm mb-2">Found {Object.keys(parsedTranslations).length} translations</p>
            <div className="space-y-1">
              {Object.entries(parsedTranslations).slice(0, 10).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                  <span className="font-mono text-gray-500 truncate">{key}</span>
                  <span className="truncate">{value}</span>
                </div>
              ))}
              {Object.keys(parsedTranslations).length > 10 && (
                <p className="text-xs text-gray-500 mt-2">
                  (showing 10 of {Object.keys(parsedTranslations).length} translations)
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onSuccess}
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={() => uploadMutation.mutate()}
          disabled={!parsedTranslations || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload Translations"}
        </Button>
      </DialogFooter>
    </div>
  );
}
