import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InsertPersona, InsertPersonaCategory } from "@shared/schema";

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
import { CheckCircle, Edit, PlusCircle, Trash2, X, Download, Upload } from "lucide-react";

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

// Main admin component
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("personas");
  
  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-6">Admin Panel</h1>
      <p className="text-gray-500 mb-8">
        Manage chat characters and categories
      </p>
      
      <Tabs defaultValue="personas" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="personas">Chat Characters</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personas">
          <PersonaManager />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoryManager />
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
              Import multiple characters from JSON or manually add them one by one.
            </DialogDescription>
          </DialogHeader>
          
          <BatchImportDialog 
            onSuccess={() => {
              setIsBatchImportOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
            }}
            categories={categories || []}
          />
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