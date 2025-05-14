import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MusicForm } from "@/components/music/MusicForm";
import { MusicGallery } from "@/components/music/MusicGallery";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function LullabyPage() {
  const { user, isLoading } = useAuth();
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("create");
  
  const handleMusicGenerated = (music: any) => {
    setSelectedMusic(music);
    setActiveTab("player");
  };
  
  const handleMusicSelect = (music: any) => {
    setSelectedMusic(music);
    setActiveTab("player");
  };
  
  // 인증 상태 확인 중 로딩 표시
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-12 h-12 border-t-4 border-b-4 border-primary rounded-full"></div>
        </div>
      </Layout>
    );
  }
  
  // 로그인 안 된 경우 로그인 유도
  if (!user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>로그인이 필요합니다</AlertTitle>
            <AlertDescription>
              자장가 생성 서비스를 이용하려면 로그인이 필요합니다.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-6 w-6" />
                자장가 만들기
              </CardTitle>
              <CardDescription>
                아이를 위한 특별한 자장가를 AI로 만들어보세요
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="mb-6">
                로그인하면 다음과 같은 기능을 이용할 수 있습니다:
              </p>
              <ul className="text-left space-y-2 max-w-md mx-auto mb-8">
                <li>• 아이의 이름과 특성을 담은 맞춤형 자장가 생성</li>
                <li>• 자장가 스타일 및 분위기 선택</li>
                <li>• 내가 만든 음악 저장 및 관리</li>
                <li>• 자장가 다운로드 및 공유</li>
              </ul>
              
              <Button asChild size="lg">
                <Link href="/auth">로그인하러 가기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Music className="h-8 w-8" />
            자장가 만들기
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            아이를 위한 특별한 자장가를 AI로 만들어보세요. 아이의 이름과 특성을 담은 맞춤형 자장가를 생성하고 
            공유할 수 있습니다. 자장가는 아이가 쉽게 잠들 수 있도록 도와줍니다.
          </p>
        </header>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="create">자장가 만들기</TabsTrigger>
              <TabsTrigger value="player">플레이어</TabsTrigger>
              <TabsTrigger value="gallery">내 자장가</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="create" className="space-y-6">
            <MusicForm onMusicGenerated={handleMusicGenerated} />
            
            <div className="bg-muted/50 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-medium mb-4">자장가 만들기 팁</h3>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>아이의 이름과 특성을 프롬프트에 포함해보세요.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>부드럽고 반복적인 멜로디가 아이의 수면에 도움이 됩니다.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>자장가 제목에 아이의 이름을 넣으면 더 특별한 자장가가 됩니다.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>가사 생성 버튼을 클릭하면 AI가 자동으로 가사를 만들어줍니다.</span>
                </li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="player">
            {selectedMusic ? (
              <div className="max-w-3xl mx-auto">
                <MusicPlayer 
                  music={selectedMusic}
                  autoPlay
                  onAddToFavorites={(id) => console.log('즐겨찾기에 추가:', id)}
                  onShare={(id) => console.log('공유:', id)}
                />
              </div>
            ) : (
              <Card className="text-center p-8 max-w-3xl mx-auto">
                <CardContent>
                  <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg mb-4">선택된 음악이 없습니다</p>
                  <p className="text-muted-foreground mb-6">
                    자장가를 생성하거나 갤러리에서 음악을 선택해주세요.
                  </p>
                  <Button onClick={() => setActiveTab("create")}>
                    자장가 만들기
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="gallery">
            <MusicGallery 
              userId={user.id}
              onMusicSelect={handleMusicSelect}
              showFilters={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}