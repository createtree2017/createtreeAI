import React, { useState, useEffect } from "react";
import { Calendar, Heart, Medal, Trophy, Clock, Milestone, Notebook } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Types for our milestone data models
interface Milestone {
  id: number;
  milestoneId: string;
  title: string;
  description: string;
  weekStart: number;
  weekEnd: number;
  badgeEmoji: string;
  badgeImageUrl?: string;
  encouragementMessage: string;
  category: string;
  order: number;
  isActive: boolean;
}

interface UserMilestone {
  id: number;
  userId: number;
  milestoneId: string;
  completedAt: string;
  notes?: string;
  photoUrl?: string;
  milestone: Milestone;
}

interface PregnancyProfile {
  id: number;
  userId: number;
  dueDate: string | Date;
  currentWeek: number;
  lastUpdated: string;
  babyNickname?: string;
  babyGender?: string;
  isFirstPregnancy?: boolean;
}

interface AchievementStats {
  totalCompleted: number;
  totalAvailable: number;
  completionRate: number;
  categories: Record<string, { completed: number; total: number; percent: number }>;
  recentlyCompleted: UserMilestone[];
}

// Category translations & colors
const categoryInfo: Record<string, { name: string; icon: React.ElementType; color: string; description: string }> = {
  baby_development: {
    name: "Baby Development",
    icon: Heart,
    color: "bg-pink-100 text-pink-800 hover:bg-pink-200",
    description: "Track your baby's growth and developmental milestones"
  },
  maternal_health: {
    name: "Maternal Health",
    icon: Heart,
    color: "bg-purple-100 text-purple-800 hover:bg-purple-200",
    description: "Monitor your health and well-being during pregnancy"
  },
  preparations: {
    name: "Preparations",
    icon: Calendar,
    color: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    description: "Get ready for baby's arrival"
  }
};

// Helper function to calculate weeks remaining
const calculateWeeksRemaining = (dueDate: string | Date): number => {
  const today = new Date();
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const diffTime = Math.abs(due.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
};

// Profile setup component
const ProfileSetup = ({ 
  onSave, 
  profile 
}: { 
  onSave: (profile: Partial<PregnancyProfile>) => void;
  profile?: PregnancyProfile;
}) => {
  const [dueDate, setDueDate] = useState<Date | undefined>(profile?.dueDate ? new Date(profile.dueDate) : undefined);
  const [babyNickname, setBabyNickname] = useState<string>(profile?.babyNickname || "");
  const [babyGender, setBabyGender] = useState<string>(profile?.babyGender || "unknown");
  const [isFirstPregnancy, setIsFirstPregnancy] = useState<boolean>(profile?.isFirstPregnancy || false);

  const handleSave = () => {
    if (!dueDate) return;
    
    onSave({
      dueDate: dueDate.toISOString(),
      babyNickname: babyNickname || undefined,
      babyGender,
      isFirstPregnancy
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Set Up Your Pregnancy Profile</h2>
        <p className="text-muted-foreground">
          This information helps us personalize your milestone tracking experience
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="due-date">Due Date <span className="text-red-500">*</span></Label>
          <DatePicker date={dueDate} onSelect={setDueDate} />
          <p className="text-sm text-muted-foreground">
            This helps us calculate which milestones are available to you
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="baby-nickname">Baby's Nickname (Optional)</Label>
          <Input
            id="baby-nickname"
            placeholder="Little One, Bean, etc."
            value={babyNickname}
            onChange={(e) => setBabyNickname(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Baby's Gender (Optional)</Label>
          <div className="flex space-x-2">
            <Button
              variant={babyGender === "boy" ? "default" : "outline"}
              onClick={() => setBabyGender("boy")}
              type="button"
            >
              Boy
            </Button>
            <Button
              variant={babyGender === "girl" ? "default" : "outline"}
              onClick={() => setBabyGender("girl")}
              type="button"
            >
              Girl
            </Button>
            <Button
              variant={babyGender === "unknown" ? "default" : "outline"}
              onClick={() => setBabyGender("unknown")}
              type="button"
            >
              Don't Know Yet
            </Button>
            <Button
              variant={babyGender === "prefer_not_to_say" ? "default" : "outline"}
              onClick={() => setBabyGender("prefer_not_to_say")}
              type="button"
            >
              Prefer Not to Say
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="first-pregnancy"
            checked={isFirstPregnancy}
            onChange={(e) => setIsFirstPregnancy(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="first-pregnancy">This is my first pregnancy</Label>
        </div>
      </div>
      
      <Button onClick={handleSave} disabled={!dueDate}>
        Save Profile
      </Button>
    </div>
  );
};

// Available milestone card component
const MilestoneCard = ({ 
  milestone, 
  onComplete 
}: { 
  milestone: Milestone; 
  onComplete: (milestoneId: string, notes?: string) => void;
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const handleComplete = () => {
    onComplete(milestone.milestoneId, notes);
    setIsDialogOpen(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`${categoryInfo[milestone.category]?.color || "bg-gray-100"}`}>
        <div className="flex justify-between items-center">
          <CardTitle>{milestone.title}</CardTitle>
          <span className="text-3xl">{milestone.badgeEmoji}</span>
        </div>
        <CardDescription>{categoryInfo[milestone.category]?.name || milestone.category}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="mb-2">{milestone.description}</p>
        <p className="text-sm text-muted-foreground">
          Weeks {milestone.weekStart}-{milestone.weekEnd}
        </p>
      </CardContent>
      <CardFooter>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Mark as Completed</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Milestone: {milestone.title}</DialogTitle>
              <DialogDescription>
                {milestone.encouragementMessage}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Add a personal note (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="How did you feel when you reached this milestone?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleComplete}>Complete Milestone</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

// Completed milestone card component
const CompletedMilestoneCard = ({ userMilestone }: { userMilestone: UserMilestone }) => {
  const { milestone } = userMilestone;
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <Card>
      <CardHeader className={`${categoryInfo[milestone.category]?.color || "bg-gray-100"}`}>
        <div className="flex justify-between items-center">
          <CardTitle>{milestone.title}</CardTitle>
          <span className="text-3xl">{milestone.badgeEmoji}</span>
        </div>
        <CardDescription>
          Completed on {format(new Date(userMilestone.completedAt), "PPP")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <p>{milestone.encouragementMessage}</p>
        
        {userMilestone.notes && (
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogTrigger asChild>
              <Button variant="link" className="pl-0 mt-2">
                View Your Notes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{milestone.title}</DialogTitle>
                <DialogDescription>
                  Completed on {format(new Date(userMilestone.completedAt), "PPP")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Your Notes</Label>
                  <div className="p-4 bg-muted rounded-md">
                    {userMilestone.notes}
                  </div>
                </div>
                
                {userMilestone.photoUrl && (
                  <div className="space-y-2">
                    <Label>Your Photo</Label>
                    <img 
                      src={userMilestone.photoUrl} 
                      alt={milestone.title} 
                      className="rounded-md max-h-60 w-auto"
                    />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

// Progress overview component
const ProgressOverview = ({ stats }: { stats: AchievementStats }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <h3 className="text-xl font-semibold">Overall Progress</h3>
          <span className="text-muted-foreground">{Math.round(stats.completionRate)}% Complete</span>
        </div>
        <Progress value={stats.completionRate} className="h-2" />
        <p className="text-sm text-muted-foreground">
          {stats.totalCompleted} of {stats.totalAvailable} milestones completed
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(stats.categories).map(([category, data]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {categoryInfo[category]?.icon && React.createElement(categoryInfo[category].icon, { className: "h-4 w-4" })}
                {categoryInfo[category]?.name || category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{data.completed} of {data.total}</span>
                  <span>{Math.round(data.percent)}%</span>
                </div>
                <Progress value={data.percent} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default function MilestonesPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<PregnancyProfile | null>(null);
  const [availableMilestones, setAvailableMilestones] = useState<Milestone[]>([]);
  const [completedMilestones, setCompletedMilestones] = useState<UserMilestone[]>([]);
  const [allMilestones, setAllMilestones] = useState<Record<string, Milestone[]>>({});
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  
  // Fetch user's pregnancy profile
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/pregnancy-profile');
      const data = await response.json();
      
      if (data.error) {
        setShowProfileSetup(true);
        return null;
      }
      
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setShowProfileSetup(true);
      return null;
    }
  };
  
  // Save pregnancy profile
  const saveProfile = async (profileData: Partial<PregnancyProfile>) => {
    try {
      const response = await fetch('/api/pregnancy-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data);
        setShowProfileSetup(false);
        toast({
          title: "Profile Updated",
          description: "Your pregnancy profile has been saved successfully.",
        });
        
        // Refresh milestones
        fetchAvailableMilestones();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    }
  };
  
  // Fetch available milestones
  const fetchAvailableMilestones = async () => {
    try {
      const response = await fetch('/api/milestones/available');
      const data = await response.json();
      setAvailableMilestones(data);
    } catch (error) {
      console.error('Error fetching available milestones:', error);
    }
  };
  
  // Fetch completed milestones
  const fetchCompletedMilestones = async () => {
    try {
      const response = await fetch('/api/milestones/completed');
      const data = await response.json();
      setCompletedMilestones(data);
    } catch (error) {
      console.error('Error fetching completed milestones:', error);
    }
  };
  
  // Fetch all milestones
  const fetchAllMilestones = async () => {
    try {
      const response = await fetch('/api/milestones');
      const data = await response.json();
      setAllMilestones(data);
    } catch (error) {
      console.error('Error fetching all milestones:', error);
    }
  };
  
  // Fetch achievement stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/milestones/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  // Complete a milestone
  const completeMilestone = async (milestoneId: string, notes?: string) => {
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Milestone Completed!",
          description: "Congratulations on reaching this milestone!",
        });
        
        // Refresh milestones and stats
        fetchAvailableMilestones();
        fetchCompletedMilestones();
        fetchStats();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to complete milestone",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error completing milestone:', error);
      toast({
        title: "Error",
        description: "Failed to complete milestone",
        variant: "destructive",
      });
    }
  };
  
  // Initialize data
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      const profile = await fetchProfile();
      
      if (profile) {
        await Promise.all([
          fetchAvailableMilestones(),
          fetchCompletedMilestones(),
          fetchAllMilestones(),
          fetchStats()
        ]);
      }
      
      setLoading(false);
    };
    
    initData();
  }, []);
  
  // If still loading or profile setup needed, show appropriate UI
  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading milestone data...</p>
        </div>
      </div>
    );
  }
  
  if (showProfileSetup || !profile) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <ProfileSetup onSave={saveProfile} profile={profile || undefined} />
      </div>
    );
  }
  
  // Render main milestones page
  return (
    <div className="container mx-auto p-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pregnancy Milestones</h1>
          <p className="text-muted-foreground">
            Track your progress and earn badges through your pregnancy journey
          </p>
        </div>
        
        <Card className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">Week {profile.currentWeek} of 40</p>
            {profile.dueDate && (
              <p className="text-sm text-muted-foreground">
                {calculateWeeksRemaining(profile.dueDate)} weeks until due date
              </p>
            )}
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                Update
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ProfileSetup onSave={saveProfile} profile={profile} />
            </DialogContent>
          </Dialog>
        </Card>
      </div>
      
      {stats && <ProgressOverview stats={stats} />}
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="available">
            Available Milestones
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed Milestones
          </TabsTrigger>
          <TabsTrigger value="all">
            All Milestones
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="space-y-4">
          {availableMilestones.length === 0 ? (
            <div className="text-center p-8">
              <div className="mx-auto h-12 w-12 text-muted-foreground flex items-center justify-center rounded-full bg-muted">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Available Milestones</h3>
              <p className="mt-1 text-muted-foreground">
                You've completed all milestones for your current pregnancy week.
                Check back as your pregnancy progresses!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableMilestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.milestoneId}
                  milestone={milestone}
                  onComplete={completeMilestone}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedMilestones.length === 0 ? (
            <div className="text-center p-8">
              <div className="mx-auto h-12 w-12 text-muted-foreground flex items-center justify-center rounded-full bg-muted">
                <Medal className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Milestones Completed Yet</h3>
              <p className="mt-1 text-muted-foreground">
                Start completing available milestones to see them here!
              </p>
              <Button 
                className="mt-4" 
                variant="outline"
                onClick={() => setActiveTab("available")}
              >
                View Available Milestones
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedMilestones.map((userMilestone) => (
                <CompletedMilestoneCard
                  key={userMilestone.id}
                  userMilestone={userMilestone}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="space-y-6">
          {Object.keys(allMilestones).length === 0 ? (
            <div className="text-center p-8">
              <div className="mx-auto h-12 w-12 text-muted-foreground flex items-center justify-center rounded-full bg-muted">
                <Milestone className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Milestones Available</h3>
              <p className="mt-1 text-muted-foreground">
                Check back later for pregnancy milestones.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(allMilestones).map(([category, milestones]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    {categoryInfo[category]?.icon && (
                      React.createElement(categoryInfo[category].icon, { className: "h-5 w-5" })
                    )}
                    <h3 className="text-xl font-semibold">
                      {categoryInfo[category]?.name || category}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    {categoryInfo[category]?.description || "Track your pregnancy milestones"}
                  </p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {milestones.map((milestone) => {
                      const isCompleted = completedMilestones.some(
                        (cm) => cm.milestoneId === milestone.milestoneId
                      );
                      const userMilestone = completedMilestones.find(
                        (cm) => cm.milestoneId === milestone.milestoneId
                      );
                      
                      if (isCompleted && userMilestone) {
                        return (
                          <CompletedMilestoneCard
                            key={milestone.milestoneId}
                            userMilestone={userMilestone}
                          />
                        );
                      }
                      
                      return (
                        <Card key={milestone.milestoneId} className="overflow-hidden">
                          <CardHeader className={`${categoryInfo[milestone.category]?.color || "bg-gray-100"}`}>
                            <div className="flex justify-between items-center">
                              <CardTitle>{milestone.title}</CardTitle>
                              <span className="text-3xl">{milestone.badgeEmoji}</span>
                            </div>
                            <CardDescription>
                              Weeks {milestone.weekStart}-{milestone.weekEnd}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <p>{milestone.description}</p>
                            
                            {profile && milestone.weekStart > profile.currentWeek && (
                              <Badge variant="outline" className="mt-2">
                                Unlocks {milestone.weekStart > profile.currentWeek ? 
                                  `at Week ${milestone.weekStart}` : 
                                  "Now"}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}