# Postcraft: LinkedIn Post Generator

Turn a topic into **three** LinkedIn post drafts with Google's Gemini API. You choose a topic, profession, tone and length. Each draft takes a different angle and is shown in a LinkedIn-style preview that you can edit and copy.

## Features

- **Bring your own key:** paste a Gemini API key in the UI. You can choose to remember it in your browser. It is sent to Google with each request and is never stored on the server.
- **Models:** Gemini 3.5 Flash (default), Gemini 3.1 Pro (preview) and Gemini 3.1 Flash-Lite.
- **Structured output:** Gemini returns JSON that follows a schema, so you always get three clean posts with hashtags.
- **UI:** animated aurora background, glass panels, rotating headline, cursor spotlight, 3D-tilt post cards, a sliding length selector, skeleton loaders, and confetti when you copy.
- Inline editing, word/character/read-time stats, a 3,000-character meter, "Surprise me" topics and ⌘/Ctrl + Enter to generate.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and paste a key from [Google AI Studio](https://aistudio.google.com/apikey).

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New → Project** and import the repo. It detects Next.js automatically.
3. Click **Deploy**. You don't need any environment variables because each user enters their own key.

Or from the CLI: `npx vercel`.

## Structure

- `app/page.tsx`: the UI (client component)
- `app/api/generate/route.ts`: serverless route that calls the Gemini `generateContent` endpoint
- `app/globals.css`: all styling
