// Scripting环境的存储工具(使用Storage API)

import { fetch } from "scripting";

/**
 * 从Storage中读取数据
 */
export function getStorage(key: string): any { // Modified: Removed generic T, return any
  try {
    const value = Storage.get(key);
    return value
  } catch (error) {
    console.error(`读取存储失败 [${key}]:`, error)
    return null
  }
}

/**
 * 向Storage中写入数据
 */
export function setStorage<T>(key: string, value: T): void {
  try {
    Storage.set(key, value)
  } catch (error) {
    console.error(`写入存储失败 [${key}]:`, error)
  }
}

/**
 * 从Storage中删除数据
 */
export function removeStorage(key: string): void {
  try {
    Storage.remove(key)
  } catch (error) {
    console.error(`删除存储失败 [${key}]:`, error)
  }
}

/**
 * 清空所有存储
 */
export function clearStorage(): void {
  try {
    Storage.clear()
  } catch (error) {
    console.error('清空存储失败:', error)
  }
}

/**
 * 从本地存储读取鉴权信息
 */
export function getStoredAuth(): { authorization: string; deviceId: string } | null {
  try {
    const authorization = getStorage('ninebot.authorization'); // Use modified getStorage
    const deviceId = getStorage('ninebot.deviceId'); // Use modified getStorage
    
    if (typeof authorization === 'string' && typeof deviceId === 'string' && authorization && deviceId) {
      return { authorization, deviceId }
    }
    return null
  } catch (error) {
    console.error('读取鉴权信息失败:', error)
    return null
  }
}

/**
 * 从 BoxJs 读取鉴权信息
 */
export async function getAuthFromBoxJs(boxJsUrl: string): Promise<{ authorization: string; deviceId: string } | null> {
  try {
    const url = `${boxJsUrl}/api/data`
    const response = await fetch(url, {
      method: 'GET',
      timeout: 10
    })
    
    const data = await response.json()
    
    // BoxJs 数据格式: { "datas": { "ninebot_authorization": "...", "ninebot_deviceId": "..." } }
    const authorization = data?.datas?.ninebot_authorization || data?.datas?.['ninebot.authorization']
    const deviceId = data?.datas?.ninebot_deviceId || data?.datas?.['ninebot.deviceId']
    
    if (authorization && deviceId) {
      return { authorization, deviceId }
    }
    
    return null
  } catch (error) {
    console.error('从 BoxJs 读取鉴权信息失败:', error)
    return null
  }
}