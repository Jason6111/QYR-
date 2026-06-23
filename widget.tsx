import { VStack, HStack, ZStack, Text, Spacer, Divider, Widget, fetch, Image, Rectangle, Circle, Capsule, Notification, type Color } from "scripting"
import { getNinebotInfo, doSign, autoOpenBlindBoxes, type NinebotWidgetData } from './api'
import { getStorage, setStorage } from './utils/storage'

// 扩展数据接口
interface ExtendedNinebotData extends NinebotWidgetData {
  waitingBoxDesc: string
  stats: {
    signStreakMax: number
  }
}

// 全局配置 - 调优间距与颜色
const Config = {
  spacing: { xs: 2, sm: 4, md: 6, lg: 8, xl: 12 },
  colors: {
    background: "#1C1C1E" as Color,
    secondaryBg: "#2C2C2E" as Color,
    textPrimary: "#FFFFFF" as Color,
    textSecondary: "#E5E5E7" as Color,
    textTertiary: "#8E8E93" as Color,
    accent: "#FFD60A" as Color,
    success: "#34C759" as Color,
    warning: "#FF9500" as Color,
    info: "#5AC8FA" as Color,
    purple: "#AF52DE" as Color
  }
}

// 根据盲盒天数获取对应颜色
const getBlindBoxColor = (awardDays: number): Color => {
  if (awardDays === 7) return Config.colors.success
  if (awardDays === 666) return Config.colors.warning
  return Config.colors.info
}

// --- 基础组件 ---

const BrandTitle = ({ fontSize = 12 }: { fontSize?: number }) => (
  <Text 
    font={fontSize} 
    fontWeight="black" 
    foregroundStyle={Config.colors.accent}
  >
    九号电动车
  </Text>
)

const SignStatusIndicator = ({ isSigned, size = 70 }: { isSigned: boolean, size?: number }) => (
  <ZStack frame={{ width: size, height: size }} alignment="center">
    <Circle fill={isSigned ? Config.colors.success : Config.colors.secondaryBg} stroke={{ shapeStyle: isSigned ? Config.colors.success : Config.colors.accent, strokeStyle: { lineWidth: 2 } }} />
    <VStack alignment="center" spacing={1}>
      <Image 
        systemName={isSigned ? "checkmark.circle.fill" : "calendar.badge.clock"} 
        font={size * 0.35} 
        fontWeight="bold"
        foregroundStyle={{ color: isSigned ? Config.colors.textPrimary : Config.colors.accent, opacity: 1 }}
      />
      <Text 
        font={size * 0.15} 
        fontWeight="bold" 
        foregroundStyle={{ color: isSigned ? Config.colors.textPrimary : Config.colors.accent, opacity: 1 }}
      >
        {isSigned ? "已签到" : "未签到"}
      </Text>
    </VStack>
  </ZStack>
)

const BlindBoxRing = ({ boxes, size = 55 }: { boxes: Array<{ awardDays: number, leftDaysToOpen: number }>, size?: number }) => {
  const pendingBoxes = boxes.filter(box => box.leftDaysToOpen > 0)
  const count = pendingBoxes.length
  const strokeWidth = size / 8

  return (
    <ZStack frame={{ width: size, height: size }} alignment="center">
      <Circle stroke={{ shapeStyle: Config.colors.secondaryBg, strokeStyle: { lineWidth: strokeWidth } }} />
      {count > 0 ? (
        pendingBoxes.map((box, index) => {
          const angle = 1 / count
          const gap = count > 1 ? 0.05 : 0
          return (
            <Circle
              key={index}
              stroke={{ 
                shapeStyle: getBlindBoxColor(box.awardDays), 
                strokeStyle: { lineWidth: strokeWidth, lineCap: "round" } 
              }}
              trim={{ from: index * angle + gap/2, to: (index + 1) * angle - gap/2 }}
            />
          )
        })
      ) : (
        <Circle stroke={{ shapeStyle: Config.colors.success, strokeStyle: { lineWidth: strokeWidth } }} />
      )}
      <VStack alignment="center" spacing={-2}>
        <Text font={size * 0.35} fontWeight="bold" foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>
          {count || boxes.length}
        </Text>
        <Text font={size * 0.18} fontWeight="medium" foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>待开</Text>
      </VStack>
    </ZStack>
  )
}

const CurrentStreakBadge = ({ streak, fontSize = 10 }: { streak: number, fontSize?: number }) => (
  <ZStack alignment="center">
    <Capsule fill={Config.colors.secondaryBg} stroke={{ shapeStyle: Config.colors.accent, strokeStyle: { lineWidth: 1 } }} />
    <HStack spacing={Config.spacing.xs} alignment={"center"} padding={{ horizontal: 6, vertical: 4 }}>
      <Image systemName="calendar.badge.clock" font={fontSize + 1} foregroundStyle={{ color: Config.colors.accent, opacity: 1 }} />
      <Text font={fontSize} fontWeight={"bold"} foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>
        连续天数 {streak}
      </Text>
    </HStack>
  </ZStack>
)

const BlindBoxAnalysisRow = ({ box }: { box: { awardDays: number, leftDaysToOpen: number } }) => {
  const color = getBlindBoxColor(box.awardDays)
  const progress = (box.awardDays - box.leftDaysToOpen) / box.awardDays
  
  return (
    <VStack alignment="leading" spacing={2}>
      <HStack spacing={Config.spacing.xs} alignment="center">
        <Text font={10} fontWeight="bold" foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>
          {box.awardDays}天盲盒
        </Text>
        <Spacer />
        <Text font={9} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>
          剩{box.leftDaysToOpen}天
        </Text>
      </HStack>
      <ZStack frame={{ height: 3.5, maxWidth: "infinity" }} alignment="leading">
        <Capsule fill={Config.colors.secondaryBg} />
        <HStack spacing={0}>
          <Capsule fill={color} frame={{ height: 3.5, width: 80 * progress }} />
          <Spacer />
        </HStack>
      </ZStack>
    </VStack>
  )
}

// --- 尺寸适配视图 ---

const SmallWidgetView = ({ info }: { info: ExtendedNinebotData }) => (
  <VStack 
    padding={Config.spacing.md} 
    spacing={Config.spacing.sm} 
    alignment="center" 
    frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
    widgetBackground="thinMaterial"
  >
    <BrandTitle fontSize={10} />
    <Spacer />
    <SignStatusIndicator isSigned={info.isSigned} size={55} />
    <VStack spacing={1} alignment="center">
      <Text font={12} fontWeight="bold" foregroundStyle={{ color: Config.colors.accent, opacity: 1 }}>LV.{info.level}</Text>
      <Text font={9} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>EXP: {info.experience}</Text>
    </VStack>
    <Spacer />
    <CurrentStreakBadge streak={info.consecutiveDays} fontSize={9} />
  </VStack>
)

const MediumWidgetView = ({ info }: { info: ExtendedNinebotData }) => {
  const pendingBoxes = info.notOpenedBoxesDetail.filter(box => box.leftDaysToOpen > 0)

  return (
    <HStack 
      padding={Config.spacing.lg} 
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }} 
      spacing={Config.spacing.md}
      widgetBackground="thinMaterial"
    >
      {/* 左侧状态 - 压缩宽度 */}
      <VStack alignment={"center"} frame={{ width: 100 }} spacing={Config.spacing.sm}>
        <BrandTitle fontSize={12} />
        <Spacer />
        <SignStatusIndicator isSigned={info.isSigned} size={65} />
        <Spacer />
        <CurrentStreakBadge streak={info.consecutiveDays} fontSize={10} />
      </VStack>
      
      <Divider />
      
      {/* 右侧数据 - 扩展空间 */}
      <VStack frame={{ maxWidth: "infinity" }} alignment={"leading"} spacing={Config.spacing.md}>
        <VStack alignment="leading" spacing={Config.spacing.xs}>
          <HStack alignment="center">
            <Text font={14} fontWeight={"bold"} foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>账户资产</Text>
            <Spacer />
            <Text font={9} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>更新于 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</Text>
          </HStack>
          <VStack alignment="leading" spacing={2}>
            <HStack spacing={Config.spacing.sm} alignment="center">
              <Text font={10} fontWeight="bold" foregroundStyle={{ color: Config.colors.accent, opacity: 1 }}>LV.{info.level}</Text>
              <Text font={10} foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>N币:{info.nCoin}</Text>
              <Text font={10} foregroundStyle={{ color: Config.colors.info, opacity: 1 }}>补签:{info.signCardsNum}</Text>
            </HStack>
            <Text font={9} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>经验成长值: {info.experience}</Text>
          </VStack>
        </VStack>
        
        <Divider />
        
        <VStack alignment={"leading"} spacing={Config.spacing.sm}>
          <Text font={12} fontWeight={"bold"} foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>🎁 待开盲盒分析</Text>
          <HStack spacing={Config.spacing.md} alignment={"center"}>
            <BlindBoxRing boxes={info.notOpenedBoxesDetail} size={45} />
            <VStack alignment="leading" spacing={Config.spacing.sm} frame={{ maxWidth: "infinity" }}>
              {pendingBoxes.length > 0 ? (
                pendingBoxes.slice(0, 2).map((box, i) => (
                  <BlindBoxAnalysisRow key={i} box={box} />
                ))
              ) : (
                <Text font={10} foregroundStyle={{ color: Config.colors.success, opacity: 1 }}>所有盲盒已就绪</Text>
              )}
            </VStack>
          </HStack>
        </VStack>
      </VStack>
    </HStack>
  )
}

const LargeWidgetView = ({ info }: { info: ExtendedNinebotData }) => {
  // 优化开启历史逻辑：按时间倒序排列,并对天数去重
  const uniqueHistory = info.openedBoxesDetail
    .sort((a, b) => parseInt(b.openedTime) - parseInt(a.openedTime)) // 按开启时间倒序
    .reduce((acc, current) => {
      // 如果结果集中还没有该天数的记录,则添加（由于已倒序排列,添加的必是该天数下最新的一条）
      const exists = acc.find(item => item.awardDays === current.awardDays)
      if (!exists) {
        acc.push(current)
      }
      return acc
    }, [] as typeof info.openedBoxesDetail)
    .slice(0, 5) // 取前5条不同天数的最新记录

  return (
    <VStack 
      padding={Config.spacing.xl} 
      spacing={Config.spacing.lg} 
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground="thinMaterial"
    >
      <MediumWidgetView info={info} />
      <Divider />
      <VStack alignment="leading" spacing={Config.spacing.md} frame={{ maxWidth: "infinity" }}>
        <Text font={15} fontWeight="bold" foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>📜 最近开启记录</Text>
        {uniqueHistory.map((box, i) => (
          <HStack key={i} spacing={Config.spacing.md} alignment="center">
            <ZStack frame={{ width: 28, height: 28 }}>
              <Circle fill={Config.colors.secondaryBg} />
              <Text font={12}>🎁</Text>
            </ZStack>
            <VStack alignment="leading" spacing={1}>
              <Text font={12} fontWeight="medium" foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>获得 {box.awardDays} 天奖励</Text>
              <Text font={10} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>
                {new Date(parseInt(box.openedTime)).toLocaleDateString()}
              </Text>
            </VStack>
            <Spacer />
            <Text font={11} fontWeight="bold" foregroundStyle={{ color: Config.colors.success, opacity: 1 }}>已入账</Text>
          </HStack>
        ))}
        {uniqueHistory.length === 0 && (
          <Text font={12} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>暂无开启记录</Text>
        )}
      </VStack>
    </VStack>
  )
}

// --- 数据获取与入口 ---

const fetchWidgetData = async (): Promise<ExtendedNinebotData> => {
  try {
    let auth = getStorage("ninebot.authorization") || ""
    let devId = getStorage("ninebot.deviceId") || ""
    
    // Get settings to check if auto sign is enabled
    const settingsStr = getStorage("ninebotSettings")
    const settings = typeof settingsStr === 'string' ? JSON.parse(settingsStr) : (settingsStr || {})
    
    // Log the parsed settings and autoSign value to debug
    console.log("Settings read from storage:", JSON.stringify(settings))
    console.log("Auto sign is enabled?", settings.autoSign)
    
    let baseData = await getNinebotInfo(auth, devId)
    
    // 自动签到
    if (settings.autoSign) {
      const now = new Date()
      const currentHours = now.getHours()
      const currentMinutes = now.getMinutes()
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`
      const targetTimeStr = settings.autoSignTime || "00:30"
      
      console.log(`自动签到检查: 当前时间 ${currentTimeStr}, 设定时间 ${targetTimeStr}`)
      
      if (currentTimeStr >= targetTimeStr) {
        if (!baseData.isSigned) {
          console.log("配置了自动签到，当前未签到且已达到设定时间，执行自动签到...")
          const signResult = await doSign(auth, devId)
          if (signResult.success) {
             console.log("自动签到成功，重新获取状态...")
             baseData = await getNinebotInfo(auth, devId)
             
             // 发送签到成功通知
             try {
               await Notification.schedule({
                 title: "🛴 九号自动签到成功",
                 body: `已连续签到 ${baseData.consecutiveDays} 天。当前 N币: ${baseData.nCoin}`,
               })
             } catch (e) {
               console.log("通知发送失败", e)
             }
          }
        } else {
           // 已经签到了，如果当前时间只过了目标时间很短，并且今天还没发过通知，这里简化处理，直接每次达到时间后刷新都发通知的话会很烦，
           // 通常我们只在签到动作执行成功的那一下发通知。用户要求“如果已签到，就通知已签到”。
           // 为了避免无限发通知，需要记录今天是否已经通知过。
           const lastNotifyDate = getStorage("ninebotLastSignNotifyDate")
           const todayDateStr = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`
           if (lastNotifyDate !== todayDateStr) {
             console.log("今天已签到，发送已签到通知")
             try {
               await Notification.schedule({
                 title: "🛴 九号今日已签到",
                 body: `您今日已完成签到。连续签到 ${baseData.consecutiveDays} 天。`,
               })
               setStorage("ninebotLastSignNotifyDate", todayDateStr)
             } catch (e) {
               console.log("通知发送失败", e)
             }
           }
        }
      } else {
        console.log("配置了自动签到，但未达到设定的签到时间，暂不签到。")
      }
    }

    // 自动开启盲盒
    if (settings.autoOpenBlindBox && baseData.notOpenedBlindBoxCount > 0) {
      console.log("配置了自动开启盲盒，当前有未开启的盲盒，执行自动开启...")
      const openResult = await autoOpenBlindBoxes(auth, devId)
      if (openResult.openSuccess > 0 || openResult.receiveSuccess > 0) {
         console.log("自动开启/领取盲盒成功，重新获取状态...")
         baseData = await getNinebotInfo(auth, devId)
      }
    }

    const signStreakMax = Math.max(getStorage('ninebotMaxSignStreak') || 0, baseData.consecutiveDays)
    setStorage('ninebotMaxSignStreak', signStreakMax)
    return {
      ...baseData,
      waitingBoxDesc: `${baseData.notOpenedBlindBoxCount}个待开`,
      stats: { signStreakMax }
    }
  } catch (error) {
    const cached = getStorage('ninebotWidgetCache') as ExtendedNinebotData | null
    if (cached) return cached
    throw error
  }
}

(async () => {
  try {
    const info = await fetchWidgetData()
    const family = Widget.family
    
    let view = <MediumWidgetView info={info} />
    if (family === "systemSmall") view = <SmallWidgetView info={info} />
    if (family === "systemLarge") view = <LargeWidgetView info={info} />

    Widget.present(view, { 
      policy: "after", 
      date: new Date(Date.now() + 1000 * 60 * 15)
    })
  } catch (error) {
    Widget.present(
      <VStack padding={12} alignment={"center"} spacing={8} widgetBackground="thinMaterial">
        <Text font={12} fontWeight={"bold"} foregroundStyle={{ color: "#FF3B30" as Color, opacity: 1 }}>加载失败</Text>
        <Text font={10} foregroundStyle={{ color: "#8E8E93" as Color, opacity: 1 }}>{(error as Error).message}</Text>
      </VStack>
    )
  }
})()