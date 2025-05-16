import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

// 음악 작업 상태 타입
type JobState = 'idle' | 'pending' | 'processing' | 'done' | 'error';

// 음악 아이템 인터페이스
interface MusicItem {
  id: number;
  title: string;
  duration: number;
  style: string;
  url: string;
  createdAt: string;
}

// 음악 작업 컨텍스트 인터페이스
interface MusicJobContextType {
  jobId: string | null;
  status: JobState;
  resultUrl: string | null;
  resultId: number | null;
  error: string | null;
  formData: {
    babyName: string;
    musicStyle: string;
    duration: string;
  };
  startJob: (params: {
    babyName: string;
    musicStyle: string;
    duration: string;
    [key: string]: any;
  }) => Promise<void>;
  clearJob: () => void;
  setFormData: (data: {
    babyName: string;
    musicStyle: string;
    duration: string;
  }) => void;
}

// 로컬 스토리지 키
const JOB_ID_KEY = "music_job_id";
const FORM_DATA_KEY = "music_form_data";

// 서버 재시작 상황을 감지하여 작업 초기화 - 현재 시간 기준 플래그
const LAST_SERVER_START_KEY = "server_start_time";

// 현재 서버 세션 식별용 타임스탬프 저장
const setServerStartTime = () => {
  const now = Date.now();
  localStorage.setItem(LAST_SERVER_START_KEY, now.toString());
  return now;
};

// 서버가 재시작되었는지 확인
const isServerRestarted = (lastStartTime: number): boolean => {
  const storedTime = localStorage.getItem(LAST_SERVER_START_KEY);
  if (!storedTime) return true;
  return parseInt(storedTime) < lastStartTime;
};

// 접속 시마다 서버 재시작 체크를 위해 데이터 강제 초기화 플래그
const FORCE_RESET_KEY = "music_job_force_reset";
const shouldForceReset = () => {
  const now = new Date().getTime();
  const lastCheck = parseInt(localStorage.getItem(FORCE_RESET_KEY) || '0');
  const hoursPassed = (now - lastCheck) / (1000 * 60 * 60);
  
  // 1시간 이상 지나면 강제 초기화
  if (hoursPassed >= 1) {
    localStorage.setItem(FORCE_RESET_KEY, now.toString());
    return true;
  }
  return false;
};

// 초기 접속 시 현재 서버 시작 시간 설정
const currentServerStartTime = setServerStartTime();

// 기본 폼 데이터
const defaultFormData = {
  babyName: "",
  musicStyle: "lullaby",
  duration: "60",
};

// 컨텍스트 생성
const MusicJobContext = createContext<MusicJobContextType | null>(null);

// Provider 컴포넌트
export function MusicJobProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [jobId, setJobId] = useState<string | null>(() => {
    // 서버 재시작 또는 강제 초기화 조건 확인
    const savedJobId = localStorage.getItem(JOB_ID_KEY);
    
    // 서버 재시작 또는 강제 초기화 조건에 해당하면 작업 초기화
    if (savedJobId && (isServerRestarted(currentServerStartTime) || shouldForceReset())) {
      console.log('서버가 재시작되었거나 오래된 작업입니다. 이전 작업을 초기화합니다.');
      localStorage.removeItem(JOB_ID_KEY);
      return null;
    }
    return savedJobId;
  });
  
  const [status, setStatus] = useState<JobState>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultId, setResultId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormValues] = useState(() => {
    try {
      const saved = localStorage.getItem(FORM_DATA_KEY);
      return saved ? JSON.parse(saved) : defaultFormData;
    } catch {
      return defaultFormData;
    }
  });

  // Job 상태 폴링
  useEffect(() => {
    if (!jobId) return;
    
    // 폴링 시작 시 상태 업데이트
    setStatus(prev => prev === 'idle' ? 'pending' : prev);
    
    let timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/music-jobs/${jobId}/status`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Job이 없으면 idle 상태로 복귀
            setStatus('idle');
            setJobId(null);
            localStorage.removeItem(JOB_ID_KEY);
            clearInterval(timer);
            return;
          }
          throw new Error(`서버 오류: ${response.status}`);
        }
        
        const data = await response.json();
        setStatus(data.state);
        
        // 완료 또는 오류 상태일 때 폴링 종료
        if (data.state === 'done') {
          setResultUrl(data.resultUrl);
          setResultId(data.resultId);
          toast({
            title: "음악 생성 완료!",
            description: "음악이 성공적으로 생성되었습니다.",
          });
          clearInterval(timer);
        }
        
        if (data.state === 'error') {
          setError(data.error || "알 수 없는 오류");
          toast({
            title: "음악 생성 실패",
            description: data.error || "음악 생성 중 오류가 발생했습니다.",
            variant: "destructive",
          });
          clearInterval(timer);
        }
      } catch (error) {
        console.error("음악 작업 상태 조회 실패:", error);
        toast({
          title: "상태 확인 오류",
          description: "음악 생성 상태를 확인하는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        clearInterval(timer);
        setStatus('error');
        setError(error instanceof Error ? error.message : "알 수 없는 오류");
      }
    }, 2000); // 2초마다 폴링
    
    return () => clearInterval(timer);
  }, [jobId, toast]);
  
  // 새 작업 시작
  const startJob = async (params: {
    babyName: string;
    musicStyle: string;
    duration: string;
    [key: string]: any;
  }) => {
    try {
      // 폼 데이터 저장
      setFormValues({
        babyName: params.babyName,
        musicStyle: params.musicStyle,
        duration: params.duration,
      });
      localStorage.setItem(FORM_DATA_KEY, JSON.stringify({
        babyName: params.babyName,
        musicStyle: params.musicStyle,
        duration: params.duration,
      }));
      
      // 결과 초기화
      setResultUrl(null);
      setResultId(null);
      setError(null);
      
      // 작업 시작 상태로 변경
      setStatus('pending');
      
      // 서버에 작업 요청
      const response = await fetch("/api/music-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "음악 생성 작업을 시작할 수 없습니다");
      }
      
      const { jobId } = await response.json();
      
      // Job ID 저장
      localStorage.setItem(JOB_ID_KEY, jobId);
      setJobId(jobId);
      
      toast({
        title: "음악 생성 시작",
        description: "음악이 백그라운드에서 생성되고 있습니다. 다른 페이지로 이동해도 계속 처리됩니다.",
      });
    } catch (error) {
      console.error("음악 생성 작업 시작 실패:", error);
      setStatus('error');
      setError(error instanceof Error ? error.message : "알 수 없는 오류");
      
      toast({
        title: "음악 생성 실패",
        description: error instanceof Error ? error.message : "음악 생성을 시작할 수 없습니다",
        variant: "destructive",
      });
    }
  };
  
  // 작업 초기화 - 상태 초기화 및 타이머 지우기
  const clearJob = () => {
    setJobId(null);
    setStatus('idle');
    setResultUrl(null);
    setResultId(null);
    setError(null);
    localStorage.removeItem(JOB_ID_KEY);
    
    // 추가: 서버에 작업 취소 요청 (실제 서버 취소 API가 구현되면 활성화)
    // if (jobId) {
    //   fetch(`/api/music-jobs/${jobId}/cancel`, { method: "POST" })
    //     .catch(err => console.error("작업 취소 실패:", err));
    // }
  };
  
  // 폼 데이터 설정
  const setFormData = (data: {
    babyName: string;
    musicStyle: string;
    duration: string;
  }) => {
    setFormValues(data);
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(data));
  };
  
  return (
    <MusicJobContext.Provider
      value={{
        jobId,
        status,
        resultUrl,
        resultId,
        error,
        formData,
        startJob,
        clearJob,
        setFormData,
      }}
    >
      {children}
    </MusicJobContext.Provider>
  );
}

// 컨텍스트 사용을 위한 훅
export function useMusicJob() {
  const context = useContext(MusicJobContext);
  if (!context) {
    throw new Error("useMusicJob must be used within a MusicJobProvider");
  }
  return context;
}