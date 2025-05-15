import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, ApiRequestOptions } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2, Music, PenLine, Globe, Clock } from "lucide-react";

interface TestResult {
  success: boolean;
  audioUrl?: string;
  input?: any;
  error?: string;
  lyrics?: string;
  duration?: number;
  prompt?: string;
  translatedPrompt?: string;
  translatedLyrics?: string;
  originalPrompt?: string;
  originalLyrics?: string;
  results?: Array<{
    duration: number;
    success: boolean;
    audioUrl?: string;
    error?: string;
    generationTime?: string;
  }>;
}

export default function TestAceStepPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("synth-pop, electronic, pop, synthesizer, drums, bass, piano, 128 BPM, energetic, uplifting, modern");
  const [lyrics, setLyrics] = useState(
    `[verse]
Woke up in a city that's always alive
Lights flashing bright as we're taking a drive
Feeling the rhythm in every street sign
This is our moment, this is our time

[chorus]
We're living in a dream tonight
Under electric skies so bright
Nothing's gonna stop us now
We're living in a dream somehow`
  );
  const [koreanPrompt, setKoreanPrompt] = useState("자장가, 피아노, 부드러운 목소리, 아기가 잠들 수 있는");
  const [koreanLyrics, setKoreanLyrics] = useState(
    `[verse]
자장자장 우리 아가
달빛 아래 잠들어요
[chorus]
엄마 품에 안겨서
꿈나라로 가요`
  );
  const [duration, setDuration] = useState(120);
  const [result, setResult] = useState<TestResult | null>(null);
  const [guidanceScale, setGuidanceScale] = useState(7);
  const [tagGuidanceScale, setTagGuidanceScale] = useState(8);
  const [lyricGuidanceScale, setLyricGuidanceScale] = useState(10);

  // 음악 생성 테스트
  const handleGenerateMusicTest = async () => {
    try {
      console.log("음악 생성 테스트 시작");
      setLoading(true);
      setResult(null);

      console.log("API 요청 전 파라미터:", {
        prompt,
        lyrics,
        duration,
        guidance_scale: guidanceScale,
        tag_guidance_scale: tagGuidanceScale,
        lyric_guidance_scale: lyricGuidanceScale
      });

      const res = await fetch("/api/test-ace-step/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          lyrics,
          duration,
          guidance_scale: guidanceScale,
          tag_guidance_scale: tagGuidanceScale,
          lyric_guidance_scale: lyricGuidanceScale
        })
      });

      console.log("API 응답 상태:", res.status, res.statusText);
      
      const data = await res.json();
      console.log("API 응답 데이터:", data);
      setResult(data);

      if (data && data.success) {
        toast({
          title: "음악 생성 성공! 🎵",
          description: "ACE-Step 모델로 음악을 생성했습니다. 아래에서 재생해 보세요."
        });
      } else {
        toast({
          title: "음악 생성 실패",
          description: data.error || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("음악 생성 중 오류:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 가사+음악 통합 테스트
  const handleGenerateWithLyrics = async () => {
    try {
      console.log("가사+음악 통합 테스트 시작");
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/test-ace-step/generate-with-lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          duration,
          style: "lullaby"
        })
      });

      console.log("API 응답 상태:", res.status, res.statusText);
      
      const data = await res.json();
      console.log("API 응답 데이터:", data);
      setResult(data);

      if (data.success) {
        toast({
          title: "가사+음악 생성 성공",
          description: "가사와 음악을 함께 생성했습니다."
        });
      } else {
        toast({
          title: "가사+음악 생성 실패",
          description: data.error || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("가사+음악 생성 중 오류:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 한국어 가사 테스트
  const handleTestKorean = async () => {
    try {
      console.log("한국어 가사 테스트 시작");
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/test-ace-step/test-korean", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          koreanPrompt,
          koreanLyrics,
          duration
        })
      });

      console.log("API 응답 상태:", res.status, res.statusText);
      
      const data = await res.json();
      console.log("API 응답 데이터:", data);
      setResult(data);

      if (data.success) {
        toast({
          title: "한국어 가사 테스트 성공",
          description: "한국어 가사로 음악을 생성했습니다."
        });
      } else {
        toast({
          title: "한국어 가사 테스트 실패",
          description: data.error || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("한국어 가사 테스트 중 오류:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 다양한 길이 테스트
  const handleTestDurations = async () => {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/test-ace-step/test-duration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          lyrics,
          durations: [60, 120, 180, 240]
        })
      });

      console.log("API 응답 상태:", res.status, res.statusText);
      
      const data = await res.json();
      console.log("API 응답 데이터:", data);
      setResult(data);

      if (data.success) {
        toast({
          title: "길이 테스트 성공",
          description: "다양한 길이로 음악을 생성했습니다."
        });
      } else {
        toast({
          title: "길이 테스트 실패",
          description: data.error || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("다양한 길이 테스트 중 오류:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">ACE-Step 음악 생성 테스트</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6 border rounded-lg p-6">
          <h2 className="text-xl font-semibold">테스트 파라미터</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">프롬프트 (영어 또는 한국어)</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="lullaby, piano, gentle voice, baby sleeping"
                className="resize-none h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">가사 (영어 또는 한국어)</label>
              <Textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="[verse]\nLullaby for my baby\nSweet dreams tonight\n[chorus]\nSleep now, rest your eyes\nTomorrow brings a new day"
                className="resize-none h-32"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">길이 (초)</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={60}>60초 (1분)</option>
                  <option value={120}>120초 (2분)</option>
                  <option value={180}>180초 (3분)</option>
                  <option value={240}>240초 (4분)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">가이던스 스케일</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">가사 가이던스</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={lyricGuidanceScale}
                  onChange={(e) => setLyricGuidanceScale(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleGenerateMusicTest}
                disabled={loading}
                className="w-full h-12 text-base font-medium relative overflow-hidden group"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    음악 생성 중...
                  </span>
                ) : (
                  <>
                    <span className="flex items-center justify-center gap-2">
                      <Music className="h-5 w-5" />
                      음악 생성 테스트
                    </span>
                    <span className="absolute bottom-0 left-0 w-full h-1 bg-primary-foreground/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                  </>
                )}
              </Button>

              <Button 
                onClick={handleGenerateWithLyrics}
                disabled={loading}
                variant="outline"
                className="w-full h-11 relative overflow-hidden group"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="flex items-center justify-center gap-2">
                      <span className="flex">
                        <Music className="h-4 w-4" />
                        <PenLine className="h-4 w-4 -ml-1" />
                      </span>
                      가사+음악 통합 테스트
                    </span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary/30 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h2 className="text-xl font-semibold">한국어 가사 테스트</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">한국어 프롬프트</label>
              <Textarea
                value={koreanPrompt}
                onChange={(e) => setKoreanPrompt(e.target.value)}
                placeholder="자장가, 피아노, 부드러운 목소리, 아기가 잠들 수 있는"
                className="resize-none h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">한국어 가사</label>
              <Textarea
                value={koreanLyrics}
                onChange={(e) => setKoreanLyrics(e.target.value)}
                placeholder="[verse]\n자장자장 우리 아가\n달빛 아래 잠들어요\n[chorus]\n엄마 품에 안겨서\n꿈나라로 가요"
                className="resize-none h-32"
              />
            </div>

            <Button 
              onClick={handleTestKorean}
              disabled={loading}
              className="w-full h-12 text-base font-medium relative overflow-hidden group"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  생성 중...
                </span>
              ) : (
                <>
                  <span className="flex items-center justify-center gap-2">
                    <Globe className="h-5 w-5" />
                    한국어 가사 테스트
                  </span>
                  <span className="absolute bottom-0 left-0 w-full h-1 bg-primary-foreground/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-6">
            <Button 
              onClick={handleTestDurations}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              다양한 길이 테스트 (60초, 120초, 180초, 240초)
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">테스트 결과</h2>

          {loading && (
            <div className="flex items-center justify-center h-60">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="로딩중" />
            </div>
          )}

          {!loading && !result && (
            <div className="text-center text-gray-500 italic py-20">
              테스트를 실행하면 결과가 여기에 표시됩니다.
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
              {/* 성공 여부 */}
              <div className={`p-3 rounded-md ${result.success ? "bg-green-100" : "bg-red-100"}`}>
                <p className="font-medium">
                  {result.success ? "✅ 성공" : "❌ 실패"}
                  {!result.success && result.error && (
                    <span className="block text-sm font-normal mt-1 text-red-700">
                      {result.error}
                    </span>
                  )}
                </p>
              </div>

              {/* 오디오 플레이어 - 개선된 UI */}
              {result.audioUrl && typeof result.audioUrl === 'string' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-green-700">🎵 생성된 음악</h3>
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {duration}초
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <audio 
                      controls 
                      src={result.audioUrl} 
                      className="w-full"
                      preload="auto"
                      controlsList="nodownload"
                    />
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-2">
                    <span className="font-medium mr-1">파일:</span>
                    <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">{result.audioUrl}</span>
                  </div>
                </div>
              )}
              {result.audioUrl && typeof result.audioUrl !== 'string' && (
                <div className="space-y-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <p className="font-medium text-yellow-800">⚠️ 음악 포맷 이슈</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded text-sm">
                    오디오 URL이 문자열이 아닌 형식으로 반환되었습니다: {typeof result.audioUrl}
                  </div>
                </div>
              )}

              {/* 프롬프트 정보 */}
              {result.prompt && (
                <div className="space-y-1">
                  <p className="font-medium">사용된 프롬프트:</p>
                  <div className="p-2 bg-gray-100 rounded text-sm">{result.prompt}</div>
                </div>
              )}

              {/* 번역 정보 */}
              {result.originalPrompt && result.translatedPrompt && (
                <div className="space-y-1">
                  <p className="font-medium">번역:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">원본 프롬프트:</p>
                      <div className="p-2 bg-gray-100 rounded text-sm">{result.originalPrompt}</div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">번역된 프롬프트:</p>
                      <div className="p-2 bg-gray-100 rounded text-sm">{result.translatedPrompt}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 가사 정보 */}
              {result.lyrics && (
                <div className="space-y-1">
                  <p className="font-medium">사용된 가사:</p>
                  <div className="p-2 bg-gray-100 rounded text-sm whitespace-pre-line">{result.lyrics}</div>
                </div>
              )}

              {/* 번역된 가사 정보 */}
              {result.originalLyrics && result.translatedLyrics && (
                <div className="space-y-1">
                  <p className="font-medium">가사 번역:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">원본 가사:</p>
                      <div className="p-2 bg-gray-100 rounded text-sm whitespace-pre-line">{result.originalLyrics}</div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">번역된 가사:</p>
                      <div className="p-2 bg-gray-100 rounded text-sm whitespace-pre-line">{result.translatedLyrics}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 다양한 길이 테스트 결과 */}
              {result.results && (
                <div className="space-y-2">
                  <p className="font-medium">다양한 길이 테스트 결과:</p>
                  <div className="space-y-2">
                    {result.results.map((item, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-md ${item.success ? "bg-green-50" : "bg-red-50"}`}
                      >
                        <p className="font-medium">
                          {item.duration}초 테스트: {item.success ? "✅ 성공" : "❌ 실패"}
                          {item.generationTime && (
                            <span className="ml-2 text-xs">(소요 시간: {item.generationTime})</span>
                          )}
                        </p>
                        {item.success && item.audioUrl && typeof item.audioUrl === 'string' && (
                          <audio 
                            controls 
                            src={item.audioUrl} 
                            className="w-full mt-2"
                          />
                        )}
                        {item.success && item.audioUrl && typeof item.audioUrl !== 'string' && (
                          <div className="p-2 bg-yellow-100 rounded text-sm mt-2">
                            오디오 URL이 문자열이 아닌 형식으로 반환되었습니다: {typeof item.audioUrl}
                          </div>
                        )}
                        {!item.success && item.error && (
                          <p className="text-sm font-normal mt-1 text-red-700">
                            {item.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 입력 파라미터 */}
              {result.input && (
                <div className="space-y-1">
                  <p className="font-medium">입력 파라미터:</p>
                  <pre className="p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {typeof result.input === 'object' ? 
                      JSON.stringify(result.input, null, 2) : 
                      `${result.input} (${typeof result.input})`}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}