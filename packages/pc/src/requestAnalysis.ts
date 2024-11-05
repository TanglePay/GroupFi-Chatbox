// 计数器和统计数据对象
let fetchCount = 0
const fetchStats = {
  totalRequests: 0,
  requestByUrlMap: {},
  successfulRequests: 0,
  failedRequests: 0
}

const requestByUrlMap: {
  [key: string]: number
} = fetchStats.requestByUrlMap

function getUrlFromArg(args: any) {
  const url = args[0] as string
  const path = url.split('?')[0]
  return path
}

// 保存原始的 fetch 函数
const originalFetch = window.fetch

// 重写全局 fetch 函数
window.fetch = async function (...args) {
  // 请求开始时增加计数
  fetchCount++
  fetchStats.totalRequests++

  const path = getUrlFromArg(args)

  requestByUrlMap[path] = (requestByUrlMap[path] ?? 0) + 1

  // 记录请求开始时间
  const startTime = Date.now()

  try {
    // 调用原始的 fetch 函数
    const response = await originalFetch(...args)

    // 请求成功，记录响应状态
    fetchStats.successfulRequests++

    // 计算请求耗时
    const endTime = Date.now()
    const timeTaken = endTime - startTime

    return response
  } catch (error) {
    // 请求失败，记录失败次数
    fetchStats.failedRequests++

    throw error // 抛出错误，以便调用方处理
  }
}

function printTime() {
  const now = new Date()
  const minutes = now.getMinutes() // 获取当前分钟（0-59）
  const seconds = now.getSeconds() // 获取当前秒数（0-59）

  return `当前时间：${minutes} 分 ${seconds} 秒`
}

let prevFetchStates: any = undefined
let stopConsoleTimes = 5
var timer = setInterval(() => {
  if (fetchStats.totalRequests === prevFetchStates?.totalRequests) {
    stopConsoleTimes--
    console.log('request analysis:stopConsoleTimes', stopConsoleTimes)
    if (stopConsoleTimes == 0) {
      console.log('request analysis', "请求总数 5s 之内没有变化，停止打印")
      clearInterval(timer)
    }
    return
  }
  stopConsoleTimes = 5
  console.log('request analysis', printTime(), {...fetchStats})
  prevFetchStates = { ...fetchStats }
}, 1000)
