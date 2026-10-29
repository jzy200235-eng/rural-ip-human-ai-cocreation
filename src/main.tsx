import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div role="note" className="pointer-events-none fixed left-1/2 top-0 z-[100] w-max max-w-[95vw] -translate-x-1/2 rounded-b-lg border border-blue-100 bg-blue-50/95 px-3 py-1 text-center text-[10px] text-blue-900">
      演示原型 · 分析页可调用配置后的模型后端 · IP为提供素材随机展示，语音与群体统计为模拟
    </div>
    <App />
  </StrictMode>,
)
