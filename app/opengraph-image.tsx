import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'FIFA World Cup 2026 Prediction Game'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#19233f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            color: '#faf8f4',
            fontSize: 64,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          FIFA World Cup 2026
        </div>
        <div
          style={{
            color: '#faf8f4',
            fontSize: 32,
            fontWeight: 400,
            opacity: 0.7,
            marginTop: 16,
          }}
        >
          Prediction Game
        </div>
      </div>
    ),
    { ...size },
  )
}
