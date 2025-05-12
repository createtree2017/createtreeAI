import { Router } from 'express';

/**
 * 오류 이미지나 로딩 상태를 위한 플레이스홀더 이미지 API 라우터
 */
export const placeholderRouter = Router();

/**
 * 플레이스홀더 이미지 생성 API
 * 스타일, 텍스트, 오류 상태에 따라 다른 SVG 이미지 생성
 */
placeholderRouter.get('/', (req, res) => {
  try {
    const { style, text, error } = req.query;
    
    // 스타일에 따라 배경색 조정
    let backgroundColor = "#A7C1E2"; // 기본 배경색
    let textColor = "#FFFFFF"; // 기본 텍스트 색상
    
    if (style) {
      // 스타일에 따라 다른 색상 제공
      const styleColors: Record<string, { bg: string, text: string }> = {
        "watercolor": { bg: "#C9E4CA", text: "#1F2421" },
        "sketch": { bg: "#E8EDDF", text: "#242423" },
        "cartoon": { bg: "#FFCDB2", text: "#6D6875" },
        "oil": { bg: "#B5838D", text: "#FFFFFF" },
        "fantasy": { bg: "#9896F1", text: "#FFFFFF" },
        "storybook": { bg: "#F28482", text: "#FFFFFF" },
        "ghibli": { bg: "#8DB1AB", text: "#FFFFFF" },
        "disney": { bg: "#457B9D", text: "#FFFFFF" },
        "korean_webtoon": { bg: "#F5CAC3", text: "#333333" },
        "fairytale": { bg: "#E0BBE4", text: "#333333" }
      };
      
      const styleInfo = styleColors[style as string];
      if (styleInfo) {
        backgroundColor = styleInfo.bg;
        textColor = styleInfo.text;
      }
    }
    
    // 에러 상태이면 빨간색 배경으로 표시
    if (error === 'true') {
      backgroundColor = "#F07167";
      textColor = "#FFFFFF";
    }
    
    // 표시할 텍스트
    const displayText = text || "이미지 불러오기 실패";
    
    // 캐싱 방지 헤더
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // SVG 플레이스홀더 생성
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <rect width="1024" height="1024" fill="${backgroundColor}" />
      <text x="512" y="512" font-family="Arial, sans-serif" font-size="40" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">
        ${displayText}
      </text>
    </svg>
    `;
    
    // SVG 응답
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    console.error("Error generating placeholder:", error);
    
    // 오류시 기본 SVG 반환
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <rect width="1024" height="1024" fill="#FF6B6B" />
      <text x="512" y="512" font-family="Arial, sans-serif" font-size="40" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">
        이미지 생성 오류
      </text>
    </svg>
    `);
  }
});