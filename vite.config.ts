/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { runtimeCaching } from './src/lib/pwa/workboxConfig';

export default defineConfig(({ mode }) => {
  const isTauri = mode === 'tauri';

  // PWA ships in web only; Tauri's webview has no use for a SW.
  const pwaPlugin = isTauri
    ? []
    : [
        VitePWA({
          registerType: 'prompt',
          injectRegister: 'auto',
          // devOptions stays disabled to avoid stale-module surprises in dev.
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
            cleanupOutdatedCaches: true,
            runtimeCaching,
            // True-offline fallback; the runtimeCaching navigation route handles online-but-slow.
            navigateFallback: '/index.html',
          },
          manifest: {
            name: 'VoiceRoundAI',
            short_name: 'VoiceRoundAI',
            description:
              'VoiceRoundAI is an AI-powered mock interviewer for technical interview practice. Voice-based Q&A with detailed feedback.',
            id: '/',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            orientation: 'any',
            theme_color: '#fffdf5',
            background_color: '#fffdf5',
            categories: ['education', 'productivity'],
            launch_handler: { client_mode: 'navigate-existing' },
            icons: [
              { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
              { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
              {
                src: '/icons/icon-192-maskable.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
              },
              {
                src: '/icons/icon-512-maskable.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
            shortcuts: [
              {
                name: 'Start interview',
                short_name: 'Start',
                description: 'Begin a new mock interview session',
                url: '/',
              },
            ],
          },
        }),
      ];

  return {
    plugins: [react(), tailwindcss(), ...pwaPlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Stub the virtual module in Tauri builds so UpdateBanner compiles without the plugin.
        ...(isTauri && {
          'virtual:pwa-register/react': path.resolve(__dirname, './src/lib/pwa/pwaRegisterStub.ts'),
        }),
      },
    },
    // Don't clear the terminal so Tauri's output stays visible alongside Vite's.
    clearScreen: false,
    server: {
      // Tauri attaches to a fixed dev URL. A changed port would break it silently.
      strictPort: true,
    },
    // Expose TAURI_* env vars to app code alongside the default VITE_*.
    envPrefix: ['VITE_', 'TAURI_'],
    // Tauri production loads via a custom protocol so assets need relative paths.
    base: isTauri ? './' : '/',
    build: {
      // Tauri uses an evergreen webview (WebView2 / WKWebView 15+), so we can
      // target modern baselines and skip the heavier browserslist defaults.
      target: isTauri ? ['chrome110', 'safari15'] : undefined,
      rolldownOptions: {
        output: {
          // Phase 10: strip `console.*` calls and `debugger` statements in
          // Tauri production bundles only. On Tauri the platform logger
          // routes through `tauri-plugin-log` (file sink), so console
          // calls are purely noise. On web, the platform logger IS
          // `console.*` — stripping would silence ErrorBoundary's durable
          // diagnostics in web production, which is a regression. Dev /
          // test builds never run minify so silence-detect logs and
          // perf-mark traces stay visible regardless.
          minify: {
            compress: { dropConsole: isTauri, dropDebugger: true },
          },
          manualChunks(id) {
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router')
            ) {
              return 'vendor';
            }
            if (id.includes('node_modules/dexie')) {
              return 'db';
            }
            if (id.includes('node_modules/openai')) {
              return 'openai';
            }
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      testTimeout: 10_000,
      coverage: {
        reporter: ['text', 'json-summary', 'json', 'html'],
        exclude: [
          'src/test/**',
          'src/constants/**',
          'src/components/ui/**',
          'src/main.tsx',
          'src/App.tsx',
          // Browser-only: require MediaRecorder, AudioContext, navigator.mediaDevices
          'src/hooks/useAudioRecorder/**',
          'src/lib/micCheck.ts',
          'src/services/tts/**',
          'src/pages/Session/MicCheckGate.tsx',
          'src/pages/Session/RecordingTimer.tsx',
          'src/pages/Session/ConversationLog.tsx',
          'src/pages/Session/Session.tsx',
          // Tauri IPC adapters need `window.__TAURI_INTERNALS__` plus
          // MediaSource/HTMLAudioElement; jsdom provides none. Contract
          // coverage happens at the service boundary via stt.test.ts,
          // streamingQuestion.test.ts, and useInterviewSession.test.tsx.
          // The pure state machine that drove ttsPlayback's edge cases
          // lives in src/lib/ttsChunkQueue.ts where it IS tested.
          'src/platform/tauri/http/**',
          // Thin OpenAI SDK wrapper — tested at the service boundary
          // (stt.test.ts uses MSW; streamingQuestion.test.ts spies on
          // `platform.http.openai.chatStream`). Adding another test layer
          // here would only verify the SDK itself.
          'src/platform/web/http/openai.ts',
        ],
      },
    },
  };
});
