import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Hospital {
  id: number;
  name: string;
  domain?: string;
  packageType?: string;
}

interface HospitalContextType {
  selectedHospital: Hospital | null;
  selectHospital: (hospital: Hospital) => void;
  clearSelectedHospital: () => void;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export function HospitalProvider({ children }: { children: ReactNode }) {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  const selectHospital = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    // 선택된 병원을 로컬 스토리지에 저장하여 페이지 새로고침 시에도 유지
    localStorage.setItem('selectedHospital', JSON.stringify(hospital));
  };

  const clearSelectedHospital = () => {
    setSelectedHospital(null);
    localStorage.removeItem('selectedHospital');
  };

  // 컴포넌트 마운트 시 로컬 스토리지에서 선택된 병원 정보 복원
  useEffect(() => {
    const savedHospital = localStorage.getItem('selectedHospital');
    if (savedHospital) {
      try {
        setSelectedHospital(JSON.parse(savedHospital));
      } catch (e) {
        console.error('저장된 병원 정보를 파싱할 수 없습니다:', e);
        localStorage.removeItem('selectedHospital');
      }
    }
  }, []); // 빈 의존성 배열로 컴포넌트 마운트 시에만 실행

  return (
    <HospitalContext.Provider value={{ selectedHospital, selectHospital, clearSelectedHospital }}>
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospital() {
  const context = useContext(HospitalContext);
  if (context === undefined) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
}