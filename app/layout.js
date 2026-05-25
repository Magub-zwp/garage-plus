import { Syne, DM_Sans } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

const syne = Syne({ subsets:['latin'], weight:['400','500','600','700','800'], variable:'--font-syne', display:'swap' })
const dm   = DM_Sans({ subsets:['latin'], weight:['400','500','600','700'], variable:'--font-dm', display:'swap' })

export const metadata = {
  title: 'Garage Plus | 179 Auto',
  description: 'ระบบจองคิวและติดตามงานซ่อมรถยนต์ 179 Auto Doi Saket',
}

export const viewport = {
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning translate="no">
      <head>
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){try{if(localStorage.getItem('gp_dark')!=='0')document.documentElement.classList.add('dark')}catch(e){}})()`
        }}/>
        <link rel="manifest" href="/manifest.json"/>
        <meta name="theme-color" content="#E8863A"/>
       
        <meta name="google" content="notranslate"/>
      </head>
      <body
        className={`${syne.variable} ${dm.variable} font-dm antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
