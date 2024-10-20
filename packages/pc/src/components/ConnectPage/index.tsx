// ... existing imports ...
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

// ... existing code ...

export function ConnectPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const navigate = useNavigate()

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // 这里添加您的连接逻辑
      // 例如：await connectWallet()
      
      // 连接成功后跳转到聊天页面
      navigate('/chat')
    } catch (error) {
      console.error('Connection failed:', error)
      // 可以在这里添加错误处理逻辑
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="px-4 py-2 bg-accent-600 text-white rounded hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-opacity-50"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  )
}

// ... rest of the existing code ...