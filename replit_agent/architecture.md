# Architecture Overview

## Overview

CreateTree Culture Center AI is a full-stack web application designed to provide AI-powered support services for mothers and pregnant women. The platform offers three main features:

1. **AI Lullaby Generation** - Creates personalized lullabies for babies
2. **Image Transformation** - Transforms and enhances memory photos
3. **AI Support Chat** - Provides conversational support through AI assistants

The application follows a modern client-server architecture with a React frontend, Express backend, and PostgreSQL database.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│                 │          │                 │          │                 │
│  React Client   │◄─────────►    Express      │◄─────────►   PostgreSQL    │
│  (Vite + React) │          │  (Node.js API)  │          │   (via Drizzle) │
│                 │          │                 │          │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
         │                           │                             │
         │                           │                             │
         ▼                           ▼                             │
┌─────────────────┐          ┌─────────────────┐                   │
│                 │          │                 │                   │
│    UI Layer     │          │  External APIs  │                   │
│  (Shadcn/UI +   │          │ (Anthropic,     │                   │
│   TailwindCSS)  │          │  OpenAI, etc.)  │                   │
│                 │          │                 │                   │
└─────────────────┘          └─────────────────┘                   │
                                                                   │
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │                 │
                                                          │  Postgres Data  │
                                                          │   (via Neon)    │
                                                          │                 │
                                                          └─────────────────┘
```

The system employs a modern web application architecture with cleanly separated concerns:

1. **Client Layer**: React application built with Vite
2. **API Layer**: Express.js server handling business logic
3. **Data Layer**: PostgreSQL database accessed through Drizzle ORM
4. **External Services**: Integration with AI services (OpenAI, Anthropic, Gemini, TopMedia)

### Frontend Architecture

The frontend is built using React with TypeScript and is bundled using Vite. It follows a component-based architecture with:

- **Pages**: High-level route components
- **Components**: Reusable UI elements
- **Hooks**: Custom React hooks for shared logic
- **Libs**: Utility functions and API clients

The UI is styled using TailwindCSS with Shadcn UI components for consistent design.

### Backend Architecture

The backend is built using Express.js with TypeScript and follows a service-oriented architecture:

- **Routes**: API endpoint definitions
- **Services**: Business logic encapsulation
- **Storage**: Database access layer
- **Database**: PostgreSQL via Neon's serverless PostgreSQL

### Data Storage Architecture

The application uses PostgreSQL for data persistence with the following characteristics:

- **ORM**: Drizzle ORM for type-safe database access
- **Connection**: Neon serverless PostgreSQL
- **Schema**: Defined in TypeScript with Drizzle schema

## Key Components

### Frontend Components

1. **Pages**
   - `Home`: Landing page with feature overview
   - `Music`: Interface for generating lullabies
   - `Image`: Interface for transforming images
   - `Chat`: Conversational AI assistant interface
   - `Gallery`: Collection of saved music and images
   - `Milestones`: Pregnancy milestone tracking
   - `Admin`: Administrative interface for content management

2. **UI Components**
   - Shadcn UI components (buttons, inputs, dialogs, etc.)
   - Custom components (audio player, image transformer, chat interface)

3. **State Management**
   - React Query for server state
   - Zustand for client state (particularly for chat functionality)

### Backend Components

1. **API Endpoints**
   - `/api/music/*`: Endpoints for music generation and management
   - `/api/image/*`: Endpoints for image transformation and management
   - `/api/chat/*`: Endpoints for chat functionality
   - `/api/gallery/*`: Endpoints for saved content management
   - `/api/admin/*`: Administrative endpoints

2. **Services**
   - `openai-simple.ts`: OpenAI API integration for chat
   - `gemini.ts`: Google Gemini API integration
   - `topmedia-music.ts`: Music generation service
   - `replicate.ts`: Replicate API integration (alternative AI service)
   - `auto-chat-saver.ts`: Automatic chat saving functionality
   - `dev-history-manager.ts`: Development chat history management

3. **Database Access**
   - `storage.ts`: Database access methods
   - `db/index.ts`: Database connection setup

### Database Schema

The database schema includes the following key tables:

1. **users**: User accounts and authentication
2. **music**: Stored music generations
3. **images**: Stored image transformations
4. **chatMessages**: Chat history
5. **favorites**: User-saved favorite items
6. **personas**: Chat personas for different AI assistant personalities
7. **concepts**: Image transformation styles and concepts
8. **milestones**: Pregnancy milestones for tracking

## Data Flow

### Music Generation Flow

1. User enters baby name and selects music style
2. Frontend sends request to `/api/music/generate`
3. Server calls external AI music generation API (TopMedia)
4. Music is stored in database and returned to client
5. User can play, download, or share the generated music

### Image Transformation Flow

1. User uploads an image and selects transformation style
2. Frontend sends image to `/api/image/transform`
3. Server calls external AI image generation API (OpenAI, Gemini, or Stability)
4. Transformed image is stored and returned to client
5. User can view, download, or share the transformed image

### Chat Conversation Flow

1. User selects a persona and sends a message
2. Frontend sends message to `/api/chat/message`
3. Server processes message through appropriate AI service
4. Response is stored in database and returned to client
5. Conversation continues with further user messages

## External Dependencies

### AI Service Integrations

1. **OpenAI API**
   - Used for: Chat functionality and image generation
   - Integration point: `openai.ts` and `openai-simple.ts`

2. **Anthropic Claude API**
   - Used for: Alternative chat model
   - Integration point: Package `@anthropic-ai/sdk`

3. **Google Gemini API**
   - Used for: Image generation
   - Integration point: `gemini.ts`

4. **TopMedia AI Music**
   - Used for: Lullaby generation
   - Integration point: `topmedia-music.ts`

### Database Technologies

1. **PostgreSQL** via Neon Serverless
   - Used for: Data persistence
   - Integration point: `@neondatabase/serverless`

2. **Drizzle ORM**
   - Used for: Type-safe database access
   - Integration point: `drizzle-orm/neon-serverless`

### Frontend Libraries

1. **React + Vite**
   - Used for: UI rendering and bundling
   - Integration point: `package.json` dependencies

2. **TailwindCSS**
   - Used for: Styling
   - Integration point: `tailwind.config.ts`

3. **shadcn/ui**
   - Used for: UI component library
   - Integration point: `components.json` and UI components

4. **React Query**
   - Used for: Data fetching and caching
   - Integration point: `@tanstack/react-query`

## Deployment Strategy

The application is deployed on Replit, as indicated by the `.replit` configuration file. The deployment process includes:

1. **Build Phase**
   - Frontend: Vite builds the React application to static assets
   - Backend: TypeScript is compiled using ESBuild

2. **Runtime Environment**
   - Node.js v20 for the backend server
   - PostgreSQL v16 for the database
   - Web server for static asset hosting

3. **Configuration**
   - Environment variables for API keys and database credentials
   - Replit Secrets for sensitive information

4. **Scaling**
   - The deployment target is set to "autoscale"
   - Server and client optimizations for performance

### CI/CD Process

The application uses Replit's built-in workflow system for continuous deployment:

1. Code changes are committed to the repository
2. Replit automatically triggers the build process
3. Tests are run (if implemented)
4. Application is deployed if successful

## Security Considerations

1. **API Key Management**
   - All third-party API keys are stored as environment variables
   - Different keys for different environments (dev/prod)

2. **Session Management**
   - Express sessions with PostgreSQL session store
   - Secure cookies for authentication

3. **Input Validation**
   - Zod schema validation for user inputs
   - Content sanitization for user-generated content

4. **Error Handling**
   - Comprehensive error handling with user-friendly messages
   - Detailed error logging for developers