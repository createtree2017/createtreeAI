import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startAutoChatSaver } from "./services/auto-chat-saver";
import session from "express-session";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 업로드 디렉토리를 정적 파일로 제공
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp3')) {
      res.set('Content-Type', 'audio/mpeg');
      res.set('Accept-Ranges', 'bytes');
    }
  }
}));

// 정적 파일 폴더 (기본 오디오 파일 등을 위해)
app.use('/static', express.static(path.join(process.cwd(), 'static')));

// CORS 설정 추가 - 세션 쿠키 전달을 위한 credentials 설정 필수
import cors from 'cors';
app.use(cors({
  // 프로덕션에서는 정확한 도메인으로 제한해야 함
  origin: true, // 개발 환경에서는 요청 Origin을 그대로 허용
  credentials: true, // 쿠키 전송을 위해 필수
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 세션 설정은 routes.ts에서 처리
// 참고: 이전에 이 위치에 있던 세션 설정은 routes.ts의 설정과 충돌을 일으켜 제거됨

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // 🔥 Express 에러 핸들러 - 모든 에러를 JSON으로 응답
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Express 에러 핸들러:', err.stack);
    
    // 이미 응답이 전송된 경우 기본 Express 에러 핸들러로 넘김
    if (res.headersSent) {
      return next(err);
    }
    
    // 모든 에러를 JSON으로 응답
    res.status(500).json({ 
      success: false, 
      message: err.message || '서버 내부 오류가 발생했습니다.',
      error: 'internal_server_error'
    });
  });

  // 🔥 404 핸들러 - HTML 대신 JSON 응답
  app.use('*', (req: any, res: any) => {
    res.status(404).json({
      success: false,
      message: '요청한 리소스를 찾을 수 없습니다.',
      error: 'not_found',
      path: req.originalUrl
    });
  });

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // 서버 시작 시 자동 저장 기능 활성화 (30분 간격)
    startAutoChatSaver(30);
    log(`자동 채팅 저장 시스템이 활성화되었습니다 (30분 간격)`);
  });
})();
