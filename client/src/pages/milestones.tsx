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
    name: "아기 발달",
    icon: Heart,
    color: "bg-pink-100 text-pink-800 hover:bg-pink-200",
    description: "아기의 성장과 발달 마일스톤 추적하기"
  },
  maternal_health: {
    name: "산모 건강",
    icon: Heart,
    color: "bg-purple-100 text-purple-800 hover:bg-purple-200",
    description: "임신 기간 동안 건강과 웰빙 관리하기"
  },
  preparations: {
    name: "출산 준비",
    icon: Calendar,
    color: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    description: "아기 맞이할 준비하기"
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
        <h2 className="text-2xl font-bold">임신 프로필 설정</h2>
        <p className="text-muted-foreground">
          임신기간 동안 맞춤형 문화경험을 안내합니다
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="due-date">출산 예정일 <span className="text-red-500">*</span></Label>
          <DatePicker date={dueDate} onSelect={setDueDate} />
          <p className="text-sm text-muted-foreground">
            이를 통해 가능한 마일스톤을 계산할 수 있습니다
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="baby-nickname">아기 애칭 (선택사항)</Label>
          <Input
            id="baby-nickname"
            placeholder="콩이, 복이 등"
            value={babyNickname}
            onChange={(e) => setBabyNickname(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>아기 성별 (선택사항)</Label>
          <div className="flex space-x-2">
            <Button
              variant={babyGender === "boy" ? "default" : "outline"}
              onClick={() => setBabyGender("boy")}
              type="button"
            >
              남자아이
            </Button>
            <Button
              variant={babyGender === "girl" ? "default" : "outline"}
              onClick={() => setBabyGender("girl")}
              type="button"
            >
              여자아이
            </Button>
            <Button
              variant={babyGender === "twins" ? "default" : "outline"}
              onClick={() => setBabyGender("twins")}
              type="button"
            >
              쌍둥이
            </Button>
            <Button
              variant={babyGender === "unknown" ? "default" : "outline"}
              onClick={() => setBabyGender("unknown")}
              type="button"
            >
              아직 모름
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
          <Label htmlFor="first-pregnancy">첫 임신입니다</Label>
        </div>
      </div>
      
      <Button onClick={handleSave} disabled={!dueDate}>
        프로필 저장
      </Button>
    </div>
  );
};

// 마일스톤 한글 제목 및 설명 번역
const milestoneTranslations: Record<string, { title: string; description: string; encouragementMessage: string }> = {
  "first-trimester-complete": {
    title: "첫 삼분기 완료",
    description: "축하합니다! 임신 첫 삼분기를 완료했습니다. 아기의 필수 구조가 형성되었고, 유산 위험이 크게 감소합니다.",
    encouragementMessage: "종종 어려운 첫 삼분기를 통과했습니다! 이제 아기는 복숭아 크기이며 빠르게 발달하고 있습니다. 아기의 모든 시스템을 위한 기초가 마련되었습니다."
  },
  "hear-babys-heartbeat": {
    title: "아기 심장 소리 듣기",
    description: "초음파 검사에서 처음으로 아기의 심장 소리를 듣는 것은 임신 중 가장 마법 같은 순간 중 하나입니다.",
    encouragementMessage: "처음으로 그 아름다운 소리를 듣는 것만큼 특별한 것은 없습니다! 아기의 심장은 현재 분당 약 120-160회 뛰고 있습니다."
  },
  "feel-baby-movement": {
    title: "아기의 첫 움직임 느끼기",
    description: "아기의 미묘한 움직임을 느끼기 시작할 것입니다. 종종 '나비'나 기포, 떨림으로 표현됩니다.",
    encouragementMessage: "그 작은 떨림은 아기가 안녕하다고 인사하는 거예요! '퀴크닝'이라고 하는 이 첫 움직임은 앞으로 몇 주 동안 점점 더 강해지고 눈에 띄게 될 것입니다."
  },
  "second-trimester-complete": {
    title: "두 번째 삼분기 완료",
    description: "임신의 중간 단계를 완료했습니다. 이 시기는 종종 가장 편안한 삼분기로 여겨집니다. 아기는 빠르게 성장하고 특징을 발달시키고 있습니다.",
    encouragementMessage: "잘 했어요! 이제 아기는 약 2파운드 무게이며 빠르게 발달하고 있습니다. 임신 여정의 마지막 구간에 접어들고 있습니다!"
  },
  "nursery-ready": {
    title: "아기방 준비 완료",
    description: "아기의 도착에 필요한 모든 필수품으로 아기 방을 준비했습니다.",
    encouragementMessage: "아기의 특별한 공간이 준비되었습니다! 미리 아기방을 준비해두면 마음의 평화를 얻고 아기의 도착에 더 준비된 느낌을 줍니다."
  },
  "hospital-bag-packed": {
    title: "병원 가방 준비 완료",
    description: "진통, 출산 및 신생아와의 첫 날을 위한 모든 필수품이 담긴 병원 가방을 준비했습니다.",
    encouragementMessage: "병원 가방을 준비해두면 출산이 다가올 때 마음의 평화를 얻을 수 있습니다. 이 설렘 가득한 다음 단계를 위해 준비되었습니다!"
  },
  "birth-plan-complete": {
    title: "출산 계획 작성 완료",
    description: "진통과 분만에 대한 선호도를 생각해보고 의료진과 공유할 유연한 출산 계획을 만들었습니다.",
    encouragementMessage: "출산 계획은 의료진에게 당신의 바람을 전달하는 데 도움이 됩니다. 출산은 예측할 수 없으므로 유연성이 중요하다는 점을 기억하세요."
  },
  "full-term-reached": {
    title: "만삭 도달",
    description: "임신 만삭에 도달한 것을 축하합니다! 아기는 이제 완전히 발달하고 출산 준비가 된 것으로 간주됩니다.",
    encouragementMessage: "놀라운 성취입니다! 이제 아기는 만삭으로 간주되며 자궁 밖에서 잘 지낼 준비가 되었습니다. 이제 곧 작은 보물을 만날 날이 올 것입니다!"
  },
  "self-care-routine": {
    title: "자기 관리 루틴 확립",
    description: "임신 여정 동안 정기적인 자기 관리 루틴을 만들고 유지했습니다.",
    encouragementMessage: "자신을 돌보는 것은 아기를 위해서도 할 수 있는 가장 좋은 일 중 하나입니다! 자기 관리에 대한 당신의 헌신은 신체적, 정서적 웰빙을 지원합니다."
  },
  "healthy-eating-habits": {
    title: "건강한 영양 섭취 챔피언",
    description: "임신 기간 동안 건강한 식습관과 적절한 영양 섭취를 꾸준히 유지했습니다.",
    encouragementMessage: "영양에 대한 당신의 헌신은 아기의 건강한 발달을 돕고 있습니다. 균형 잡힌 식단은 당신과 아기 모두에게 중요한 영양소를 제공합니다."
  }
};

// 마일스톤 기본 영어 제목과 한글 제목 매핑
function getTranslatedMilestone(milestone: Milestone) {
  const translation = milestoneTranslations[milestone.milestoneId];
  
  if (translation) {
    return {
      ...milestone,
      displayTitle: translation.title,
      displayDescription: translation.description,
      displayEncouragementMessage: translation.encouragementMessage
    };
  }
  
  return {
    ...milestone,
    displayTitle: milestone.title,
    displayDescription: milestone.description,
    displayEncouragementMessage: milestone.encouragementMessage
  };
}

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
  const translatedMilestone = getTranslatedMilestone(milestone);

  const handleComplete = () => {
    onComplete(milestone.milestoneId, notes);
    setIsDialogOpen(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`${categoryInfo[milestone.category]?.color || "bg-gray-100"}`}>
        <div className="flex justify-between items-center">
          <CardTitle>{translatedMilestone.displayTitle}</CardTitle>
          <span className="text-3xl">{milestone.badgeEmoji}</span>
        </div>
        <CardDescription>{categoryInfo[milestone.category]?.name || milestone.category}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="mb-2">{translatedMilestone.displayDescription}</p>
        <p className="text-sm text-muted-foreground">
          {milestone.weekStart}-{milestone.weekEnd}주
        </p>
      </CardContent>
      <CardFooter>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">완료 표시하기</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>마일스톤 완료: {translatedMilestone.displayTitle}</DialogTitle>
              <DialogDescription>
                {translatedMilestone.displayEncouragementMessage}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="notes">개인 메모 추가 (선택사항)</Label>
                <Textarea
                  id="notes"
                  placeholder="이 마일스톤을 달성했을 때 어떤 느낌이었나요?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
              <Button onClick={handleComplete}>마일스톤 완료</Button>
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
  const translatedMilestone = getTranslatedMilestone(milestone);

  return (
    <Card>
      <CardHeader className={`${categoryInfo[milestone.category]?.color || "bg-gray-100"}`}>
        <div className="flex justify-between items-center">
          <CardTitle>{translatedMilestone.displayTitle}</CardTitle>
          <span className="text-3xl">{milestone.badgeEmoji}</span>
        </div>
        <CardDescription>
          {format(new Date(userMilestone.completedAt), "PPP")}에 완료됨
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <p>{translatedMilestone.displayEncouragementMessage}</p>
        
        {userMilestone.notes && (
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogTrigger asChild>
              <Button variant="link" className="pl-0 mt-2">
                내 메모 보기
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translatedMilestone.displayTitle}</DialogTitle>
                <DialogDescription>
                  {format(new Date(userMilestone.completedAt), "PPP")}에 완료됨
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>내 메모</Label>
                  <div className="p-4 bg-muted rounded-md">
                    {userMilestone.notes}
                  </div>
                </div>
                
                {userMilestone.photoUrl && (
                  <div className="space-y-2">
                    <Label>내 사진</Label>
                    <img 
                      src={userMilestone.photoUrl} 
                      alt={translatedMilestone.displayTitle} 
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
          <h3 className="text-xl font-semibold">전체 진행 상황</h3>
          <span className="text-muted-foreground">{Math.round(stats.completionRate)}% 완료</span>
        </div>
        <Progress value={stats.completionRate} className="h-2" />
        <p className="text-sm text-muted-foreground">
          {stats.totalAvailable}개 중 {stats.totalCompleted}개의 마일스톤 완료
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
                  <span>{data.total}개 중 {data.completed}개</span>
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
          title: "프로필 업데이트됨",
          description: "임신 프로필이 성공적으로 저장되었습니다.",
        });
        
        // Refresh milestones
        fetchAvailableMilestones();
      } else {
        toast({
          title: "오류",
          description: data.error || "프로필 저장에 실패했습니다",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "오류",
        description: "프로필 저장에 실패했습니다",
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
          title: "마일스톤 완료!",
          description: "이 마일스톤에 도달한 것을 축하합니다!",
        });
        
        // Refresh milestones and stats
        fetchAvailableMilestones();
        fetchCompletedMilestones();
        fetchStats();
      } else {
        toast({
          title: "오류",
          description: data.error || "마일스톤 완료에 실패했습니다",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error completing milestone:', error);
      toast({
        title: "오류",
        description: "마일스톤 완료에 실패했습니다",
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
          <p className="mt-4">마일스톤 데이터 로딩 중...</p>
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
          <h1 className="text-3xl font-bold">임신 마일스톤</h1>
          <p className="text-muted-foreground">
            임신기간 동안 맞춤형 문화경험을 안내합니다
          </p>
        </div>
        
        <Card className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">임신 {profile.currentWeek}주 / 40주</p>
            {profile.dueDate && (
              <p className="text-sm text-muted-foreground">
                출산 예정일까지 {calculateWeeksRemaining(profile.dueDate)}주 남음
              </p>
            )}
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                업데이트
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
            가능한 마일스톤
          </TabsTrigger>
          <TabsTrigger value="completed">
            완료된 마일스톤
          </TabsTrigger>
          <TabsTrigger value="all">
            모든 마일스톤
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="space-y-4">
          {availableMilestones.length === 0 ? (
            <div className="text-center p-8">
              <div className="mx-auto h-12 w-12 text-muted-foreground flex items-center justify-center rounded-full bg-muted">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">가능한 마일스톤 없음</h3>
              <p className="mt-1 text-muted-foreground">
                현재 임신 주차에 대한 모든 마일스톤을 완료했습니다.
                임신이 진행됨에 따라 다시 확인해 보세요!
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
              <h3 className="mt-4 text-lg font-semibold">아직 완료된 마일스톤이 없습니다</h3>
              <p className="mt-1 text-muted-foreground">
                가능한 마일스톤을 완료하여 여기에서 확인하세요!
              </p>
              <Button 
                className="mt-4" 
                variant="outline"
                onClick={() => setActiveTab("available")}
              >
                가능한 마일스톤 보기
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
              <h3 className="mt-4 text-lg font-semibold">사용 가능한 마일스톤 없음</h3>
              <p className="mt-1 text-muted-foreground">
                나중에 다시 확인하여 임신 마일스톤을 확인하세요.
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
                    {categoryInfo[category]?.description || "임신 마일스톤 추적하기"}
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
                              {milestone.weekStart}-{milestone.weekEnd}주
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <p>{milestone.description}</p>
                            
                            {profile && milestone.weekStart > profile.currentWeek && (
                              <Badge variant="outline" className="mt-2">
                                {milestone.weekStart > profile.currentWeek ? 
                                  `${milestone.weekStart}주차에 잠금 해제` : 
                                  "지금 가능"}
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