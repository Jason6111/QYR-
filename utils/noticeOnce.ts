import { Notification } from "scripting"

// 通知去重工具
const notifiedMessages = new Set<string>()

type NoticeOptions = {
  sound?: boolean
}

/**
 * 发送通知(去重),同样的消息只发送一次
 */
export async function noticeOnce(title: string, body: string, options?: NoticeOptions): Promise<void> {
  const key = `${title}:${body}`
  
  if (notifiedMessages.has(key)) {
    return
  }
  
  notifiedMessages.add(key)
  
  try {
    await Notification.schedule({
      title,
      body,
      silent: !(options?.sound ?? false) // if sound is true, silent is false. Default to silent.
    })
  } catch (error) {
    console.error('发送通知失败:', error)
  }
}

/**
 * 清空已发送通知记录
 */
export function clearNoticeCache(): void {
  notifiedMessages.clear()
}