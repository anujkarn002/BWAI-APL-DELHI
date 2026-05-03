# StadiumBite

**StadiumBite** is a live food-rating Progressive Web App designed for stadium events. It solves a simple problem — fans at a venue have no quick way to discover what food is worth buying. With StadiumBite, fans scan a QR code displayed around the stadium, open the app instantly in their browser (no app store download needed), log in with just their phone number and a one-time OTP, and start reviewing food in seconds.

The core flow is built around speed: snap a photo of your food, give it a star rating, write a quick review, and submit. The entire process takes under 10 seconds. Behind the scenes, Gemini 2.5 Flash AI analyzes the uploaded photo to automatically detect and classify what food item is in the image — so fans don't need to manually search through a menu catalog. The same AI layer moderates every review for abusive content, spam, and PII leakage, all without blocking the user experience. If the AI service is temporarily unavailable, reviews are auto-approved through a fail-open design, ensuring the app never feels broken.

A real-time leaderboard, powered by Server-Sent Events (SSE), updates live across every connected device in the stadium. Fans can see which food stalls are trending, what's rated highest, and what the crowd is eating right now — creating a shared, interactive experience during the event.

The app is built with React 19 and TypeScript on the frontend, FastAPI on the backend, Google Cloud Firestore as the database, and deployed as a single container on Google Cloud Run. This single-container architecture means the FastAPI server serves both the API and the React SPA, eliminating CORS complexity and simplifying deployment.

## Key Features

- **Photo-first reviews with AI food detection** — Gemini Vision automatically identifies the food item from the photo, removing friction from the review process and ensuring accurate food categorization without manual input.
- **Real-time leaderboard** — Live rankings of food stalls and items update across all connected devices via SSE, turning food discovery into a collective stadium experience.
- **AI content moderation (fail-open design)** — Every review passes through Gemini for safety, abuse, and PII checks asynchronously. If AI is down, reviews still go through — reliability over strictness.
- **PWA — installable from browser** — Works on any phone, no app store required. Supports offline caching and can be added to the home screen for a native app feel.
- **Admin API for food catalog management** — Full CRUD for managing food stalls, menu items, review moderation, and event statistics through a dedicated admin interface.
