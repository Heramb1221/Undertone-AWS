# Undertone

> Privacy-first, anonymous interest-based discussion platform designed for introverts with Cognito authentication, single-table DynamoDB, real-time WebSockets, AWS Rekognition image moderation, and Amazon Polly voice synthesis.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Flask](https://img.shields.io/badge/Flask-API-red?style=for-the-badge&logo=flask)
![AWS Cognito](https://img.shields.io/badge/AWS--Cognito-Auth-336791?style=for-the-badge&logo=amazon-aws)
![AWS DynamoDB](https://img.shields.io/badge/AWS--DynamoDB-Single--Table-4053D6?style=for-the-badge&logo=amazon-aws)
![AWS ECS](https://img.shields.io/badge/AWS--ECS--Fargate-Containers-FF9900?style=for-the-badge&logo=amazon-aws)
![AWS API Gateway](https://img.shields.io/badge/AWS--API--Gateway-WebSockets-232F3E?style=for-the-badge&logo=amazon-aws)
![Status](https://img.shields.io/badge/Status-Complete--Prototype-green?style=for-the-badge)

---

# Live Demo

| Resource | Link |
|---|---|
| Web Frontend | [Undertone Live (Vercel)](https://undertone-web.vercel.app/) |
| Backend API | [Undertone API (ECS Fargate)](https://undertone-backend.onrender.com) |

---

# About The Project

Undertone is a full-stack, cross-platform social application (Web and Mobile) built to prioritize user privacy and mental peace. Designed as an alternative to mainstream discussion platforms like Reddit, Undertone implements pseudonymous, interest-based identity generation and features:

- **Interest-Based Onboarding**: Users register with only an email and password. Their display profile is automatically generated from selected interest areas (e.g. `CalmReader_69`, `MutedTinkerer_98`).
- **Circles**: Private/public interest-based community hubs where users post, comment, and collaborate.
- **Nod/Pass & Resonance**: Upvotes/downvotes are replaced by Nods (affirmation) and Passes (dismissal), contributing to a user's *Resonance* score.
- **Rhythm**: Engagement streak metrics awarded based on daily actions (posting, voting, commenting).
- **AI Media Processing**: Uploaded images are automatically moderated using Amazon Rekognition, and Amazon Polly synthesizes voice narration for posts on-demand.

The platform is designed around a fully AWS-native backend stack optimized for the AWS Free Tier, utilizing a single-table DynamoDB layout, Cognito auth tokens, API Gateway WebSockets for real-time DMs, and ECS/Fargate container hosting.

---

# Project Type

| Attribute | Value |
|---|---|
| Category | Privacy-First Social Web & Mobile Application |
| Architecture | Hybrid Monorepo (Next.js Web + React Native Mobile + Flask Backend API) |
| Database Model | DynamoDB Single-Table Design |
| API Pattern | REST API (Flask) + WebSocket Gateway (Realtime DMs / Broadcasts) |
| Auth Model | JWT-based auth via Amazon Cognito |
| Media Storage | Direct-to-S3 uploads with short-lived presigned URLs |
| Container Orchestration | Amazon ECS + AWS Fargate (Serverless Containers) |

---

# Project Status

**Production-Architecture Learning Prototype**

All 20 implementation phases are complete and verified. The platform features fully functional web and mobile apps communicating with a containerized Flask backend integrated with AWS serverless tools. The project demonstrates real-world software engineering practices:
- Automated local AWS testing utilizing the `moto` mocking framework.
- Atomic database operations using DynamoDB Transaction Writes.
- Automated CI/CD deployment workflows.
- Extensive security reviews and cost optimization audits.

---

# Why I Built This

Most portfolio projects rely on typical relational SQL models and standard third-party SaaS tools. I built Undertone to gain hands-on expertise with AWS enterprise patterns, specifically:

- **Single-Table Design**: Modeling a complex, interrelated social network schema inside a single DynamoDB table to achieve single-digit millisecond latency.
- **Serverless WebSockets**: Scaling live direct messaging via Amazon API Gateway and AWS Lambda without maintaining costly connection servers.
- **Cryptographic Security**: Securing and verifying Cognito JSON Web Tokens (JWT) at the backend API boundary.
- **Cost Discipline**: Designing architecture strictly within AWS Free Tier limits (e.g., opting for Fargate container scaling over Application Load Balancers to eliminate idle fees).

---

# Features

## Core Features
- **Anonymous Identity Onboarding**: Multi-step flow generating unique pseudonymous handles and DiceBear avatars.
- **Nested Comment Tree**: Recursive threaded replies collapsing automatically beyond a specific depth (3 levels on Web, 2 levels on Mobile).
- **Membership Controls**: Join or leave Circles dynamically, updating aggregate home feed streams.
- **Nod/Pass Voting**: Atomic concurrency-safe counters affecting user profiles via Resonance propagation.
- **Audio Read-Aloud**: On-demand text-to-speech post narration.
- **Direct Messaging (DM)**: Chat interface with instant message delivery and inbox aggregations.
- **Moderator Queues**: Active Circle reporting with Remove, Ban, and Dismiss resolutions.

---

## AWS Integration Features
- **DynamoDB Atomic Transactions**: Atomically enforces uniqueness of Circle names across the entire database.
- **Direct-to-S3 Uploads**: Frontend uploads image files directly to secure S3 buckets using presigned PUT URLs, preventing server bandwidth choking.
- **API Gateway WebSockets**: Standardized serverless socket handler managing connections, disconnections, and real-time DM routing.
- **Rekognition Content Moderation**: Machine-learning moderation automatically scanning S3 images and placing flagged content in the moderator queue.
- **Polly Audio Caching**: Synthesized Polly speech saved as MP3 files in S3 (`audio/<post_id>.mp3`) to prevent redundant API calls.

---

## Security & DX Features
- **Cognito JWT Verification**: Backend cryptographically validates signature and expiration of Cognito identity tokens.
- **IaC Automation (`manage.py`)**: Unified Python tool utilizing `boto3` to provision or tear down the entire stack (`up`, `status`, `down`).
- **Offline AWS Mocking**: Local testing suite using `moto` to test Cognito, S3, Polly, Rekognition, and DynamoDB (67+ test cases passing).
- **Safe Area UI Layouts**: Precise mobile Safe Area Context layouts preventing notched screen overlaps.

---

# Tech Stack

## Frontend

| Technology | Purpose |
|---|---|
| Next.js 15 | React Web framework (App Router) |
| React 19 | Client/Server UI rendering |
| Tailwind CSS | Styling framework |
| React Native | Mobile client runtime |
| Expo SDK 57 | Cross-platform mobile development |
| react-native-safe-area-context | Device layout adjustments |
| expo-audio | Read-aloud narration player |

## Backend

| Technology | Purpose |
|---|---|
| Python / Flask | Core REST API service |
| Gunicorn | Production WSGI application server |
| Boto3 | AWS SDK for Python |
| Pytest + Moto | Offline AWS unit-testing environment |

## Database & AWS Infrastructure

| Technology | Purpose |
|---|---|
| Amazon Cognito | User authentication & token provider |
| Amazon DynamoDB | Primary database (Single-Table Design) |
| Amazon S3 | Asset uploads and Polly speech cache |
| Amazon ECS / Fargate | Serverless container hosting |
| Amazon API Gateway | WebSocket API gateway |
| AWS Lambda | Serverless WebSocket event handler |
| Amazon Rekognition | AI image content moderation |
| Amazon Polly | AI text-to-speech audio synthesis |

---

# Architecture

Undertone isolates the client, API layer, database, and real-time layers to maintain clear logical boundaries.

```text
       ┌───────────┐         ┌─────────────┐
       │  Next.js  │         │ React Native│
       │  Web App  │         │  Mobile App │
       └─────┬─────┘         └──────┬──────┘
             │                      │
             └──────────┬───────────┘
                        ▼
             ┌────────────────────┐
             │ Flask API Backend  ├──────────────┐
             │  (ECS on Fargate)  │              │
             └──────────┬─────────┘              ▼
                        │             ┌────────────────────┐
                        │             │ API Gateway Sockets│
                        │             │     (WebSockets)   │
                        ▼             └──────────┬─────────┘
             ┌────────────────────┐              │
             │   Amazon Cognito   │              ▼
             │  (JWT Verification)│      ┌──────────────┐
             └──────────┬─────────┘      │  AWS Lambda  │
                        │                └──────┬───────┘
                        ▼                       │
             ┌────────────────────┐             │
             │  Amazon DynamoDB   │◄────────────┘
             │(Single-Table Design)│
             └──────────┬─────────┘
                        │
                        ▼
             ┌────────────────────┐
             │     Amazon S3      │
             │  (Media & Polly)   │
             └────────────────────┘
```

---

## Onboarding & Identity Generation Lifecycle

```text
User opens Onboarding Screen
      │
      ▼
Selects Interest Chips (e.g. music, tech)
      │
      ▼
Request Name Generation (Flask API) -> Returns "CalmReader_69"
      │
      ▼
Create Account (Cognito User Pool Sign Up) -> Verifies email
      │
      ▼
DynamoDB Single-Table Write -> Saves user profile (USER#<id>)
```

---

## Secure S3 Media Upload Lifecycle

```text
Create Post with Image (Web/Mobile)
      │
      ▼
Request Presigned URL from Flask API
      │
      ▼
S3 generates secure, short-lived PUT URL
      │
      ▼
Client directly PUTs image file to S3
      │
      ▼
Client sends image S3 Key to Flask API to create Post
      │
      ▼
Rekognition Scans Image in background -> Auto-flags if explicit -> Holds for review
```

---

# Folder Structure

```text
undertone/
├── backend/                  # Flask REST API, services & unit tests
│   ├── app/
│   │   ├── models/           # DynamoDB single-table entities (vote, post, comment)
│   │   ├── routes/           # Flask routes (circles, identity, dm, reports)
│   │   ├── services/         # AWS integrations (s3, polly, rekognition, push)
│   │   └── auth.py           # Cognito JWT signature verification
│   └── tests/                # 67+ offline pytest suites (moto mock)
│
├── web/                      # Next.js 15 web client
│   ├── app/                  # App router pages (feed, circles, dm, profile)
│   ├── components/           # UI components library (design system)
│   └── lib/                  # Cognito auth and API HTTP client
│
├── mobile/                   # React Native (Expo SDK 57) mobile app
│   ├── src/
│   │   ├── navigation/       # Stack & Bottom Tab navigators
│   │   ├── screens/          # Screens (Feed, Explore, Dms, Profile)
│   │   └── lib/              # Cognito auth client & push notification utils
│   └── app.json              # Expo application configuration
│
├── infra/                    # IaC automated provisioning
│   ├── scripts/
│   │   ├── manage.py         # python IaC CLI (up, status, down, deploy)
│   │   └── seed_circles.py   # circle database seeder script
│   └── k8s-equivalent/       # Kubernetes manifests (deployments, ingresses)
│
└── docs/                     # PRD, designs, glossary, plans
```

---

# Installation

## Prerequisites
- Python >= 3.10
- Node.js >= 18.x
- AWS CLI configured with active credentials
- Expo CLI (`npm install -g expo-cli`)

---

## Setup

### 1. Provision AWS Infrastructure
You must provision Cognito, DynamoDB, ECR, and S3 first using the automated IaC CLI:
```bash
cd infra/scripts
pip install boto3
python manage.py up
```
*Note the Cognito User Pool ID, App Client ID, DynamoDB Table Name, and S3 Bucket Name printed in the console.*

### 2. Configure and Run Backend locally
Create a `.env` in `/backend`:
```env
AWS_REGION=ap-south-1
COGNITO_USER_POOL_ID=your_user_pool_id
COGNITO_CLIENT_ID=your_app_client_id
DYNAMODB_TABLE=your_dynamodb_table_name
S3_BUCKET_NAME=your_s3_bucket_name
```
Run the Flask server:
```bash
cd backend
pip install -r requirements.txt
python app/main.py
```

### 3. Run Web Client
Create a `.env.local` in `/web`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_app_client_id
```
Start the development server:
```bash
cd web
npm install
npm run dev
```

### 4. Run Mobile App
Configure your local environment variables in `mobile/app.json` inside the `expo.extra` block:
```json
"extra": {
  "apiUrl": "http://10.0.2.2:5000",
  "cognitoUserPoolId": "your_user_pool_id",
  "cognitoClientId": "your_app_client_id"
}
```
Start Metro:
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with your physical device (via Expo Go) or boot up an Android Emulator.

---

# Environment Variables

### `/backend/.env`
```env
AWS_REGION=ap-south-1
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
DYNAMODB_TABLE=
S3_BUCKET_NAME=
WEBSOCKET_API_ENDPOINT=
```

### `/web/.env.local`
```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_WS_URL=
```

### `/mobile/app.json`
Configure values under `"expo" -> "extra"`:
```json
"extra": {
  "apiUrl": "http://10.0.2.2:5000",
  "cognitoUserPoolId": "",
  "cognitoClientId": "",
  "wsUrl": "",
  "eas": {
    "projectId": ""
  }
}
```

---

# Usage

## Dynamic Identity Generation
During account onboarding, pick interests to generate a pseudonymous profile name. This name represents your identity, and a customizable avatar seed will be saved dynamically to DynamoDB.

## Threaded Node/Pass Feed
Browse feed posts, click **Nod** (to affirm) or **Pass** (to dismiss) to dynamically update the post author's Resonance. Double click to toggle your vote. Banned or self-voting users are automatically blocked.

## Real-time Direct Messaging
Open the messaging portal, look up an anonymous name, and start chatting. If the WebSocket layer is deployed, messages deliver instantly; otherwise, it automatically falls back to a 4-second API polling system.

## Amazon Polly Speech Synthesizer
Tap the **Read aloud** button on any post. The app will fetch a pre-signed S3 download link of the post's voice synthesis. If it hasn't been generated yet, Polly will synthesize and save it to S3.

---

# API Documentation

Undertone features a REST API + a WebSockets protocol for real-time messaging.

## REST Endpoints

### Identity & Profiles
- `POST /api/identity/generate-name` - Generate interest-based names.
- `POST /api/identity` - Create user anonymous profile.
- `GET /api/identity/<userId>` - Retrieve user profile attributes.

### Circles & Posts
- `POST/GET /api/circles` - Create or fetch Circles.
- `POST/GET /api/circles/<circleId>/posts` - Post or fetch Circle feeds.
- `POST/GET /api/circles/<circleId>/posts/<postId>/vote` - Cast a Nod/Pass vote.

### Comments
- `POST/GET /api/posts/<postId>/comments` - Add or retrieve post comment threads.
- `POST/GET /api/posts/<postId>/comments/<commentId>/vote` - Vote on comments.

### Realtime & DMs
- `POST /api/dm/send` - Send a direct message.
- `GET /api/dm/conversation/<recipientId>` - Fetch direct message history.
- `GET /api/dm/inbox` - Retrieve chat inbox list.

---

# Screenshots

| Screen | Description |
|---|---|
| <img width="1917" height="863" alt="image" src="https://github.com/user-attachments/assets/fba40a29-b3be-4a1f-b8d3-72c30859fe78" /> | Home page |
| <img width="1920" height="1378" alt="image" src="https://github.com/user-attachments/assets/2acff287-6f37-497c-a93d-603e797e5ae5" /> | Post and Comments |
| <img width="1897" height="857" alt="image" src="https://github.com/user-attachments/assets/a417a585-2a8d-41c0-88c7-b536dbb667f4" /> | Nested Chat Threads |

---

# Performance Considerations

## Optimizations Implemented
- **Polly Audio Caching**: Voice synthesis tracks are cached in S3 (`audio/<post_id>.mp3`). Subsequent requests fetch the cached MP3 URL directly rather than triggering Polly billing.
- **Single-Table DynamoDB Queries**: Users, Posts, Comments, and Votes are fetched via index queries (`PK`/`SK` matches) in single-digit milliseconds, removing relational SQL joins.
- **RSC Data Fetching**: Next.js Server Components handle core feeds server-side to accelerate page loads.
- **Fail-Open Gates**: Rekognition content moderation caps out at 4,500 monthly calls; Polly caps at 4.8 million characters. Past these thresholds, services fail open rather than halting app operation.

---

## Known Bottlenecks
- **Polling DM fallback**: The 4-second polling backup for DMs generates continuous Flask database queries if WebSockets are offline.
- **N+1 GSI queries**: DynamoDB query projections without index mappings require additional profile lookups for authors when retrieving comment lists.

---

# Security Considerations

## Implemented

| Concern | Implementation |
|---|---|
| Authentication | AWS Cognito JWT validation at Flask gateway |
| Direct-to-S3 Safety | Secure pre-signed PUT URLs preventing malicious server uploads |
| IDOR Protection | Routes strictly validate Cognito payload claims against request IDs |
| Image Moderation | Automatic NSFW Rekognition filtering placing flagged media in moderator queues |
| Vote Spoofing | Self-vote prevention (Nod/Pass on own posts returns a 403) |

---

## Known Limitations
- Cognito verification is only applied to moderator resolve-report endpoints; the remaining REST endpoints rely on client-provided IDs (detailed in `docs/Security-Review.md`).
- S3 Blob URLs are publicly accessible via HTTP once presigned links are read.
- No API rate-limiting layers are implemented on Cognito/REST endpoints.

---

# Tradeoffs & Limitations

| Decision | Tradeoff |
|---|---|
| Vercel Web Hosting | Chosen over S3+CloudFront because Next.js RSC dynamic routes require node server runtimes. A Fargate frontend service would have incurred Fargate fees (no free tier), violating cost constraints. |
| ECS Fargate without ALBs | Public container IPs are mapped directly to save Application Load Balancer costs ($15+/month), sacrificing automatic routing/balancing. |
| Expo Push Proxy over SNS | Android OS demands Firebase Cloud Messaging (FCM) credentials. Deploying raw SNS still requires FCM backend routing; we opted for Expo's push service to bypass SNS-FCM credentials management. |
| Single-Table Design | Yields incredibly high read speeds but complicates query filtering, requiring redundant local data structures. |

---

# Known Issues

| Issue | Severity |
|---|---|
| 19 REST endpoints lack Cognito JWT validation | High |
| Missing API rate-limiting | High |
| Image upload path collision | Medium |
| WebSockets lack connection heartbeats | Medium |

---

# Technical Debt
- Code duplication between Flask database model files (`app/models`) and the independent AWS Lambda WebSockets handler script (`infra/lambda/websocket_handler.py`).
- No automated UI test coverage (e.g. Cypress or Playwright).

---

# Challenges Faced
- **Android push notification configurations**: The Android OS requires Firebase (FCM) configurations even when using AWS SNS, prompting a transition to Expo's Push service.
- **Millisecond Timestamp Collisions**: Highly concurrent comments posted within the same second had key collisions, requiring a millisecond precision refactor in DynamoDB Sort Keys (`SK`).
- **React Native Safe Areas**: Status bar and notch overlaps on multiple screen views required configuring a nested navigator parameter mapping alongside `<SafeAreaProvider>`.

---

# What I Learned
- Structuring complex social platforms using a Single-Table DynamoDB schema.
- Writing cryptographic JWT validation algorithms inside Python WSGI middleware.
- Developing robust timeout-backed polling fallback clients in React Native.
- AWS container pipelines using ECR, Task Definitions, and ECS Fargate deployments.

---

# Future Scope

## Engineering Improvements
- Migrate all remaining 19 REST endpoints to Cognito verification middleware.
- Configure a Redis rate-limiting container on ECS.
- Consolidate model code between Flask backend and AWS Lambda socket handlers.

## Product Expansion
- Dynamic private circle invitation models.
- Auto-moderator AI flagging text posts (using Amazon Comprehend).
- Direct screen sharing within DMs.

---

# Repository Philosophy
Undertone was built to explore cloud-native containerized architecture and high-performance serverless AWS integrations. The emphasis was not on deploying basic database CRUD apps, but on studying real-world database optimizations, cloud security, and cross-platform native SDK systems.

---

# License
Distributed under the MIT License. See `LICENSE` for details.

---

# Contact

**Heramb Chaudhari**

[![GitHub](https://img.shields.io/badge/GitHub-Heramb1221-black?style=for-the-badge&logo=github)](https://github.com/Heramb1221)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Heramb%20Chaudhari-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/heramb-chaudhari)

[![Email](https://img.shields.io/badge/Email-hchaudhari1221%40gmail.com-red?style=for-the-badge&logo=gmail)](mailto:hchaudhari1221@gmail.com)
