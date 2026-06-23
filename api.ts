import { httpGet, httpPost } from './utils/request'

// 定义小组件展示的数据结构
export interface NinebotWidgetData {
  isSigned: boolean
  nCoin: number
  experience: number
  level: number
  consecutiveDays: number
  signCardsNum: number
  blindBoxCount: number
  notOpenedBlindBoxCount: number
  openedBlindBoxCount: number
  minLeftDaysToOpen: number | null
  // 新增详细盲盒信息
  notOpenedBoxesDetail: Array<{
    awardDays: number
    leftDaysToOpen: number
    rewardStatus: number
  }>
  openedBoxesDetail: Array<{
    awardDays: number
    openedTime: string
  }>
}

// 盲盒信息
export interface BlindBoxInfo {
  id: string
  leftDaysToOpen: number
  status: number
  type: number
  rewardStatus?: number
  awardDays?: number
}

// 从抓包中获取的 appVersion (用于 balance 接口)
const APP_VERSION = "609113620"

// 九号电动车接口地址
const API_ENDPOINTS = {
  signStatus: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status?t=${Date.now()}`, 
  sign: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign?t=${Date.now()}`,
  balance: `https://cn-cbu-gateway.ninebot.com/portal/self-service/task/account/money/balance?appVersion=${APP_VERSION}`, 
  creditInfo: 'https://api5-h5-app-bj.ninebot.com/web/credit/get-msg',
  blindBoxList: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/list?t=${Date.now()}`,
  openBlindBox: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/open',
  receiveBlindBox: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/receive',
}

// 使用抓包中获取的 User-Agent
const NINEBOT_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Segway v6 C 609113620"

/**
 * 构造请求头（接收外部传入的鉴权信息）
 */
const getAuthHeaders = (authorization: string, deviceId: string): Record<string, string> => {
  if (!authorization || !deviceId) {
    throw new Error('鉴权信息不完整: authorization 或 deviceId 为空')
  }

  const dynamicCookie = "KLBRSID=ecf4c07eae7a7caf8c71ec8fd4d9263e|1765980756|1765980713"
  const dynamicAid = "1000004"

  return {
    'Authorization': authorization,
    'device_id': deviceId,
    'User-Agent': NINEBOT_USER_AGENT,
    'Content-Type': 'application/json',
    'sys_language': 'zh-CN',
    'accept': 'application/json, text/plain, */*',
    'platform': 'h5',
    'origin': 'https://h5-bj.ninebot.com',
    'language': 'zh',
    'referer': 'https://h5-bj.ninebot.com/',
    'sec-fetch-dest': 'empty',
    'sec-fetch-site': 'same-site',
    'sec-fetch-mode': 'cors',
    'Cookie': dynamicCookie,
    'aid': dynamicAid,
  }
}

/**
 * 获取九号电动车用户信息（支持传入鉴权参数）
 */
export async function getNinebotInfo(authorization: string, deviceId: string): Promise<NinebotWidgetData> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)

    // 请求签到状态
    console.log("请求签到状态...")
    const statusResp = await httpGet(API_ENDPOINTS.signStatus, { headers })
    
    let isSigned = false
    let consecutiveDays = 0
    let signCardsNum = 0 
    
    if (statusResp.data && statusResp.data.code === 0 && statusResp.data.data) {
      isSigned = statusResp.data.data.currentSignStatus === 1
      consecutiveDays = statusResp.data.data.consecutiveDays || 0
      signCardsNum = statusResp.data.data.signCardsNum || 0 
      console.log("✅ 签到状态解析成功:", { isSigned, consecutiveDays, signCardsNum })
    } else {
      console.warn("⚠️ 签到状态 API 返回错误:", statusResp.data?.msg || statusResp.data?.message || JSON.stringify(statusResp.data))
    }

    // 请求N币余额
    console.log("请求N币余额...")
    const balanceResp = await httpGet(API_ENDPOINTS.balance, { headers })
    
    let nCoin = 0
    
    if (balanceResp.data && balanceResp.data.code === 0 && balanceResp.data.data) {
      nCoin = balanceResp.data.data.balance || 0 
      console.log("✅ N币余额解析成功:", nCoin)
    } else {
      console.warn("⚠️ N币余额 API 返回错误:", balanceResp.data?.msg || balanceResp.data?.message || JSON.stringify(balanceResp.data))
    }

    // 请求经验等级
    console.log("请求经验等级...")
    const creditResp = await httpGet(API_ENDPOINTS.creditInfo, { headers })
    
    let level = 0
    let experience = 0
    
    if (creditResp.data && creditResp.data.code === 1 && creditResp.data.data) {
      level = creditResp.data.data.level || 0
      experience = creditResp.data.data.credit || 0
      console.log("✅ 经验等级解析成功:", { level, experience })
    } else {
      console.warn("⚠️ 经验等级 API 返回错误:", creditResp.data?.msg || creditResp.data?.message || JSON.stringify(creditResp.data))
    }

    // 请求盲盒数据
    console.log("请求盲盒数据...")
    const blindBoxResp = await httpGet(API_ENDPOINTS.blindBoxList, { headers })

    let blindBoxCount = 0
    let notOpenedBlindBoxCount = 0
    let openedBlindBoxCount = 0
    let minLeftDaysToOpen: number | null = null
    let notOpenedBoxesDetail: Array<{awardDays: number, leftDaysToOpen: number, rewardStatus: number}> = []
    let openedBoxesDetail: Array<{awardDays: number, openedTime: string}> = []

    if (blindBoxResp.data && blindBoxResp.data.code === 0 && blindBoxResp.data.data) {
      const notOpenedBoxes = blindBoxResp.data.data.notOpenedBoxes || []
      const openedBoxes = blindBoxResp.data.data.openedBoxes || []

      notOpenedBlindBoxCount = notOpenedBoxes.length
      openedBlindBoxCount = openedBoxes.length
      blindBoxCount = notOpenedBlindBoxCount + openedBlindBoxCount

      // 提取详细信息
      notOpenedBoxesDetail = notOpenedBoxes.map((box: any) => ({
        awardDays: box.awardDays || 0,
        leftDaysToOpen: box.leftDaysToOpen || 0,
        rewardStatus: box.rewardStatus || 0
      }))

      openedBoxesDetail = openedBoxes.map((box: any) => ({
        awardDays: box.awardDays || 0,
        openedTime: box.openedTime || ''
      }))

      if (notOpenedBlindBoxCount > 0) {
        minLeftDaysToOpen = Math.min(...notOpenedBoxes.map((box: any) => box.leftDaysToOpen))
      }
      
      console.log("✅ 盲盒数据解析成功:", { 
        notOpenedBlindBoxCount, 
        openedBlindBoxCount, 
        minLeftDaysToOpen,
        notOpenedBoxesDetail,
        openedBoxesDetail
      })
    } else {
      console.warn("⚠️ 盲盒 API 返回错误:", blindBoxResp.data?.msg || blindBoxResp.data?.message || JSON.stringify(blindBoxResp.data))
    }

    const result = { 
      isSigned, 
      nCoin, 
      experience, 
      level, 
      consecutiveDays,
      signCardsNum,
      blindBoxCount,
      notOpenedBlindBoxCount,
      openedBlindBoxCount,
      minLeftDaysToOpen,
      notOpenedBoxesDetail,
      openedBoxesDetail,
    }
    
    console.log("📊 最终解析结果:", JSON.stringify(result))
    
    return result
  } catch (error) {
    console.error("❌ API 请求错误:", error)
    throw new Error(`接口请求失败: ${(error as Error).message}`)
  }
}

/**
 * 获取可开启的盲盒列表
 */
export async function getOpenableBlindBoxes(authorization: string, deviceId: string): Promise<BlindBoxInfo[]> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const blindBoxResp = await httpGet(API_ENDPOINTS.blindBoxList, { headers })

    if (blindBoxResp.data && blindBoxResp.data.code === 0 && blindBoxResp.data.data) {
      const notOpenedBoxes = blindBoxResp.data.data.notOpenedBoxes || []
      const openableBoxes = notOpenedBoxes
        .filter((box: any) => box.leftDaysToOpen === 0)
        .map((box: any) => ({
          id: box.id,
          leftDaysToOpen: box.leftDaysToOpen,
          status: box.status || 0,
          type: box.type || 0,
          rewardStatus: box.rewardStatus || 0,
          awardDays: box.awardDays || 0
        }))
      
      console.log(`✅ 找到 ${openableBoxes.length} 个可开启的盲盒`)
      return openableBoxes
    }
    
    console.warn("⚠️ 盲盒列表获取失败")
    return []
  } catch (error) {
    console.error("❌ 获取盲盒列表错误:", error)
    throw error
  }
}

/**
 * 开启单个盲盒
 */
export async function openBlindBox(authorization: string, deviceId: string, boxId: string): Promise<{success: boolean, reward?: any, message?: string}> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const url = `${API_ENDPOINTS.openBlindBox}?t=${Date.now()}`
    
    const response = await httpPost(url, { 
      body: { id: boxId },
      headers: headers
    })
    
    if (response.data && response.data.code === 0) {
      console.log(`✅ 盲盒 ${boxId} 开启成功`)
      return {
        success: true,
        reward: response.data.data,
        message: '开启成功'
      }
    } else {
      const errorMsg = response.data?.msg || response.data?.message || '开启失败'
      console.warn(`⚠️ 盲盒 ${boxId} 开启失败:`, errorMsg)
      return {
        success: false,
        message: errorMsg
      }
    }
  } catch (error) {
    console.error(`❌ 开启盲盒 ${boxId} 错误:`, error)
    return {
      success: false,
      message: (error as Error).message
    }
  }
}

/**
 * 领取单个盲盒奖励
 */
export async function receiveBlindBox(authorization: string, deviceId: string, boxId: string): Promise<{success: boolean, reward?: any, message?: string}> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const url = `${API_ENDPOINTS.receiveBlindBox}?t=${Date.now()}`
    
    const response = await httpPost(url, { 
      body: { id: boxId },
      headers: headers
    })
    
    if (response.data && response.data.code === 0) {
      console.log(`✅ 盲盒 ${boxId} 领取成功`)
      return {
        success: true,
        reward: response.data.data,
        message: '领取成功'
      }
    } else {
      const errorMsg = response.data?.msg || response.data?.message || '领取失败'
      console.warn(`⚠️ 盲盒 ${boxId} 领取失败:`, errorMsg)
      return {
        success: false,
        message: errorMsg
      }
    }
  } catch (error) {
    console.error(`❌ 领取盲盒 ${boxId} 错误:`, error)
    return {
      success: false,
      message: (error as Error).message
    }
  }
}

/**
 * 执行自动签到
 */
export async function doSign(authorization: string, deviceId: string): Promise<{ success: boolean; message: string }> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const url = `${API_ENDPOINTS.sign}`
    
    // According to Ninebot js script, sign endpoint is a POST with { deviceId: "..." }
    const postResponse = await httpPost(url, { 
      headers, 
      body: { deviceId: deviceId }
    })
    
    if (postResponse.data && postResponse.data.code === 0) {
      console.log(`✅ 签到成功`)
      return { success: true, message: '签到成功' }
    } else {
      const errorMsg = postResponse.data?.msg || postResponse.data?.message || '签到失败'
      console.warn(`⚠️ 签到失败:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  } catch (error) {
    console.error(`❌ 签到错误:`, error)
    return { success: false, message: (error as Error).message }
  }
}

/**
 * 自动开启所有可开启的盲盒（包含开启和领取两步）
 */
export async function autoOpenBlindBoxes(authorization: string, deviceId: string): Promise<{
  total: number
  openSuccess: number
  receiveSuccess: number
  failed: number
  rewards: any[]
  errors: string[]
}> {
  try {
    console.log("🎁 开始自动开启盲盒...")
    
    const openableBoxes = await getOpenableBlindBoxes(authorization, deviceId)
    
    if (openableBoxes.length === 0) {
      console.log("ℹ️ 暂无可开启的盲盒")
      return {
        total: 0,
        openSuccess: 0,
        receiveSuccess: 0,
        failed: 0,
        rewards: [],
        errors: []
      }
    }
    
    const results = {
      total: openableBoxes.length,
      openSuccess: 0,
      receiveSuccess: 0,
      failed: 0,
      rewards: [] as any[],
      errors: [] as string[]
    }
    
    for (const box of openableBoxes) {
      console.log(`🎁 处理盲盒 ${box.id} (${box.awardDays}天)...`)
      
      // 第一步: 开启盲盒
      const openResult = await openBlindBox(authorization, deviceId, box.id)
      
      if (!openResult.success) {
        results.failed++
        results.errors.push(`盲盒 ${box.id} 开启失败: ${openResult.message}`)
        console.log(`❌ 盲盒 ${box.id} 开启失败，跳过领取`)
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000))
        continue
      }
      
      results.openSuccess++
      console.log(`✅ 盲盒 ${box.id} 开启成功`)
      
      // 等待1秒再领取
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000))
      
      // 第二步: 领取盲盒奖励
      const receiveResult = await receiveBlindBox(authorization, deviceId, box.id)
      
      if (receiveResult.success) {
        results.receiveSuccess++
        if (receiveResult.reward) {
          results.rewards.push({
            boxId: box.id,
            awardDays: box.awardDays,
            reward: receiveResult.reward
          })
        }
        console.log(`✅ 盲盒 ${box.id} 领取成功`)
      } else {
        results.errors.push(`盲盒 ${box.id} 领取失败: ${receiveResult.message}`)
        console.log(`⚠️ 盲盒 ${box.id} 领取失败: ${receiveResult.message}`)
      }
      
      // 等待1秒再处理下一个
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000))
    }
    
    console.log(`🎁 盲盒处理完成: 总计 ${results.total}, 开启成功 ${results.openSuccess}, 领取成功 ${results.receiveSuccess}, 失败 ${results.failed}`)
    
    return results
  } catch (error) {
    console.error("❌ 自动开启盲盒错误:", error)
    throw error
  }
}