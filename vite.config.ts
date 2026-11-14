import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '더나은',
        short_name: '더나은',
        description: '사람을 챙기고 나를 돌아보며 더 나은 사람이 되는 연습 — 관계 기록 · 오늘의 미션 · 성장 일기',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5f4f2',
        // 안드로이드에 설치한 앱은 이 색으로 하단 내비게이션(제스처) 바를 칠한다 — 강조색(주황)이면 탭바 아래에
        // 주황 띠가 생겨서, 다크 모드 탭바 배경(--card)과 같은 색으로 둔다. 상단 상태바는 index.html의
        // theme-color(라이트/다크별)가 따로 덮어쓴다.
        theme_color: '#222425',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Firestore/Google 로그인 등 외부 요청은 건드리지 않고, 빌드된 앱 정적 파일만 캐시한다.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // 동기화(Firebase) 청크는 동기화를 실제로 쓰는 사람만 받게 동적 import로 분리해둔 것 —
        // 여기서 미리 캐시해버리면 그 의미가 없어지므로 제외한다.
        globIgnores: ['**/sync-*.js'],
      },
    }),
  ],
})
