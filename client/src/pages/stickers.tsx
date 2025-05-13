import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

export default function StickersPage() {
  // 서비스 로딩 상태
  const [isLoading, setIsLoading] = React.useState(false);
  
  // 파일 업로드 상태
  const [file, setFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    
    // 여기에 파일 처리 로직 구현 예정
    await new Promise(resolve => setTimeout(resolve, 2000)); // 임시 지연
    
    setIsLoading(false);
    alert('준비 중인 기능입니다. 조금만 기다려주세요!');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">스티커 만들기</h1>
      <p className="text-muted-foreground mb-8">
        AI를 사용하여 사진을 귀여운 스티커로 변환해보세요.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>사진 업로드</CardTitle>
            <CardDescription>
              스티커로 만들고 싶은 사진을 업로드하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={handleUploadClick}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*" 
                  className="hidden" 
                />
                
                {file ? (
                  <div className="mt-2">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="미리보기" 
                      className="max-h-[300px] mx-auto mb-4 rounded-lg" 
                    />
                    <p className="text-sm">{file.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-gray-500">사진을 클릭하여 업로드하세요</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF 지원</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!file || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '스티커 만들기'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>스티커 만들기 안내</CardTitle>
            <CardDescription>
              재미있는 스티커로 대화에 활력을 더하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">어떤 사진이 좋을까요?</h3>
              <p className="text-sm text-muted-foreground">
                배경이 단순하고 선명한 사진, 인물이나 물체가 잘 보이는 사진이 좋은 결과를 얻을 수 있습니다.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">스티커는 어디에 사용할 수 있나요?</h3>
              <p className="text-sm text-muted-foreground">
                생성된 스티커는 다양한 메신저 앱이나 SNS에서 사용할 수 있습니다. 다운로드 후 원하는 곳에 활용하세요.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">생성된 스티커는 어떻게 저장하나요?</h3>
              <p className="text-sm text-muted-foreground">
                생성된 모든 스티커는 자동으로 갤러리에 저장되며, 언제든지 다시 다운로드할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">스티커 예시</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-100 rounded-lg p-4 h-48 flex items-center justify-center">
            <p className="text-gray-500">준비 중입니다</p>
          </div>
          <div className="bg-gray-100 rounded-lg p-4 h-48 flex items-center justify-center">
            <p className="text-gray-500">준비 중입니다</p>
          </div>
          <div className="bg-gray-100 rounded-lg p-4 h-48 flex items-center justify-center">
            <p className="text-gray-500">준비 중입니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}