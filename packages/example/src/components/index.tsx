'use client'
import React, { useEffect, useRef, useState } from 'react'
import { RenderChatboxOptions } from './types'
// import { GroupFiApp } from '../../../pc/src/index' // 导入 GroupFiApp


const BORDER_SIZE = 4

// const defaultImagePosition = {
//   right: 10,
//   bottom: 10
// }

// const defaultImageSize = {
//   width: 42,
//   height: 48
// }

// 获取存储的尺寸
const getStoredSize = () => {
  if (typeof window === 'undefined') return {}
  return JSON.parse(localStorage.getItem('groupfi-trollbox-size') || '{}')
}

// 计算聊天框尺寸
const getTrollboxSize = () => {
  if (typeof window === 'undefined') return { width: 385, height: 640 }
  const size = getStoredSize()
  return {
    width: Math.min(size.width || 385, window.innerWidth - 26),
    height: Math.min(size.height || 640, window.innerHeight * 0.9)
  }
}

const maxTrollboxSize = {
  width: 480,
  height: typeof window !== 'undefined' ? window.innerHeight - 28 : 800
}

const minTrollboxSize = {
  width: 320,
  height: 240
}

const trollboxPosition = {
  right: 5,
  bottom: 5
}

interface ChatboxProps extends RenderChatboxOptions {}

export default function Chatbox({ theme = 'light', uiConfig, isWalletConnected = false, isGroupfiNativeMode = false }: ChatboxProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(getTrollboxSize())
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const trollboxPreference = localStorage.getItem('trollbox.preference')
    const isVisible = trollboxPreference ? JSON.parse(trollboxPreference).isOpen : true

    // 创建主容器
    const container = containerRef.current
    if (!container) return

    // 设置容器样式
    setStyleProperties(container.style, {
      position: 'fixed',
      zIndex: 100,
      visibility: isVisible ? 'visible' : 'hidden',
      borderRadius: '16px',
      padding: BORDER_SIZE,
      background: theme === 'light' ? '#fff' : '#212122',
      boxShadow: '0 6px 6px -1px rgba(0,0,0,0.1)',
      ...size,
      ...trollboxPosition
    })

    // 添加拖拽调整大小的处理器
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const newWidth = Math.min(maxTrollboxSize.width, 
        Math.max(minTrollboxSize.width, window.innerWidth - e.clientX))
      const newHeight = Math.min(maxTrollboxSize.height,
        Math.max(minTrollboxSize.height, window.innerHeight - e.clientY))
      
      setSize({ width: newWidth, height: newHeight })
      localStorage.setItem('groupfi-trollbox-size', JSON.stringify({ width: newWidth, height: newHeight }))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, theme, size])

  return (
    <>
      <div ref={containerRef} className="chatbox-container">
        {/* 左侧调整手柄 */}
        <div
          className="resize-handle left"
          onMouseDown={() => setIsDragging(true)}
          style={{
            position: 'absolute',
            left: 0,
            top: BORDER_SIZE,
            width: BORDER_SIZE * 2.5,
            height: '100%',
            cursor: 'ew-resize'
          }}
        />
        {/* 顶部调整手柄 */}
        <div
          className="resize-handle top"
          onMouseDown={() => setIsDragging(true)}
          style={{
            position: 'absolute',
            left: BORDER_SIZE,
            top: 0,
            width: '100%',
            height: BORDER_SIZE * 2.5,
            cursor: 'ns-resize'
          }}
        />
        
        {/* 修改内容区域，使用 GroupFiApp */}
        <div className="chatbox-content" style={{
          height: '100%',
          overflow: 'auto'
        }}>
          chat
        </div>
      </div>

      {/* 背景遮罩 - 用于拖拽时 */}
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.001)',
            zIndex: 99
          }}
        />
      )}
    </>
  )
}

// 辅助函数：设置样式
function setStyleProperties(
  style: CSSStyleDeclaration,
  properties: { [key: string]: string | number }
) {
  Object.entries(properties).forEach(([key, value]) => {
    style[key as any] = typeof value === 'number' ? `${value}px` : value
  })
}