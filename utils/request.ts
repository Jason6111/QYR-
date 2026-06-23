// Scripting环境的HTTP请求工具(替代$httpClient)

import { fetch } from "scripting"

interface RequestOptions {
  headers?: Record<string, string>
  method?: string
  body?: any
}

interface HttpResponse {
  data: any
  status: number
  headers: Record<string, string>
}

/**
 * 发送HTTP GET请求,带重试机制
 */
export async function httpGet(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
  return httpRequest(url, { ...options, method: 'GET' })
}

/**
 * 发送HTTP POST请求,带重试机制
 */
export async function httpPost(url: string, body?: any, options: RequestOptions = {}): Promise<HttpResponse> {
  if (arguments.length === 2 && typeof arguments[1] !== 'string' && !(arguments[1] instanceof String)) {
    // 如果只传了两个参数，且第二个参数不是字符串，那么第二个参数是options
    return httpRequest(url, { ...arguments[1], method: 'POST' })
  } else {
    // 正常情况：url, body, options
    return httpRequest(url, { ...options, method: 'POST', body })
  }
}

/**
 * 通用HTTP请求函数,支持重试
 */
async function httpRequest(
  url: string, 
  options: RequestOptions = {}, 
  retryCount: number = 3
): Promise<HttpResponse> {
  const { headers = {}, method = 'GET', body } = options
  
  for (let i = 0; i < retryCount; i++) {
    try {
      const fetchOptions: any = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 30
      }

      if (body !== undefined) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
      }

      const response = await fetch(url, fetchOptions)

      const text = await response.text()
      let data: any
      
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }

      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      if (i === retryCount - 1) {
        throw new Error(`请求失败(已重试${retryCount}次): ${(error as Error).message}`)
      }
      // 等待后重试
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1000 * (i + 1))
      })
    }
  }
  
  throw new Error('请求失败')
}