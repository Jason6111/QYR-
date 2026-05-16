import {
  Navigation,
  NavigationStack,
  List,
  Section,
  TextField,
  Button,
  Text,
  Toggle,
  Script,
  Color,
  HStack,
  Spacer,
  useState,
  fetch
} from "scripting"

declare const Dialog: any
declare const Safari: any
declare const Pasteboard: any

// 版本信息
const VERSION = "1.0.2"
const BUILD_DATE = "2025-12-19"

// 存储键
const SETTINGS_KEY = "ninebotSettings"
const FULLSCREEN_KEY = "ninebotSettingsFullscreen"

// 九号的 BoxJs 订阅链接（和联通逻辑一致）
const NINEBOT_BOXJS_JSON_URL =
  "https://raw.githubusercontent.com/QinyRui/QYR-/jiuhao/Ninebot.boxjs.json"
const NINEBOT_BOXJS_SUB_URL =
  `http://boxjs.com/#/sub/add/${encodeURIComponent(NINEBOT_BOXJS_JSON_URL)}`

// 设置数据结构
export interface NinebotSettings {
  authorization: string
  deviceId: string
  userAgent: string
  enableBoxJs: boolean
  boxJsUrl: string
  refreshInterval: number
  autoOpenBlindBox: boolean
}

// 默认设置
const defaultSettings: NinebotSettings = {
  authorization: "",
  deviceId: "",
  userAgent: "Ninebot/3620 CFNetwork/3860.200.71 Darwin/25.1.0",
  enableBoxJs: false,
  boxJsUrl: "https://boxjs.com",
  refreshInterval: 15,
  autoOpenBlindBox: false,
}

// 工具函数：验证DeviceId格式
const validateDeviceId = (deviceId: string): boolean => {
  return /^[0-9A-F-]{32,}$/i.test(deviceId)
}

// 工具函数：测试API连接
const testApiConnection = async (auth: string, deviceId: string, ua: string) => {
  try {
    if (!auth) throw new Error("Authorization不能为空")
    if (!validateDeviceId(deviceId)) throw new Error("DeviceId格式错误，应为UUID格式")

    const response = await fetch("https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status", {
      method: "GET",
      headers: {
        "Authorization": auth,
        "device_id": deviceId,
        "User-Agent": ua || defaultSettings.userAgent,
        "Content-Type": "application/json"
      },
      timeout: 10
    })

    return response.ok 
      ? { success: true, message: "API连接成功，鉴权信息有效" } 
      : { success: false, message: `API请求失败，状态码：${response.status}` }
  } catch (error: any) {
    return { success: false, message: `连接异常：${error.message || "未知错误"}` }
  }
}

// 工具函数：测试BoxJs连接
const testBoxJsConnection = async (url: string) => {
  try {
    const testUrl = `${url.replace(/\/$/, "")}/api/boxjs/get?key=Ninebot`
    const response = await fetch(testUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "NinebotSettings/1.0.2",
        "Referer": url,
      },
      timeout: 15000
    })
    const raw = await response.text()
    if (raw.startsWith("<")) throw new Error("返回HTML，接口地址错误")
    const data = JSON.parse(raw)
    return { success: true, message: "BoxJs连接成功，可读取Ninebot变量" }
  } catch (error: any) {
    return { success: false, message: `BoxJs连接失败：${error.message || "请检查地址是否正确"}` }
  }
}

// 工具函数：从 BoxJS 读取鉴权信息（与 widget.tsx 逻辑完全一致）
const syncAuthFromBoxJs = async (boxJsUrl: string) => {
  try {
    const baseUrl = boxJsUrl.replace(/\/$/, "")
    const authUrl = `${baseUrl}/query/data/ninebot.authorization`
    const deviceUrl = `${baseUrl}/query/data/ninebot.deviceId`
    
    console.log(`📡 开始从 BoxJs 同步鉴权信息`)
    console.log(`   Authorization URL: ${authUrl}`)
    console.log(`   DeviceId URL: ${deviceUrl}`)
    
    // 使用与 widget.tsx 完全相同的请求方式
    const [authResponse, deviceResponse] = await Promise.all([
      fetch(authUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "NinebotSettings/1.0.2",
          "Referer": baseUrl,
        },
        timeout: 10000
      }),
      fetch(deviceUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "NinebotSettings/1.0.2",
          "Referer": baseUrl,
        },
        timeout: 10000
      })
    ])

    console.log(`✅ BoxJs 请求完成`)
    console.log(`   Authorization Status: ${authResponse.status}`)
    console.log(`   DeviceId Status: ${deviceResponse.status}`)

    // 先获取文本，便于调试
    const authText = await authResponse.text()
    const deviceText = await deviceResponse.text()
    
    console.log(`📄 原始响应:`)
    console.log(`   Authorization: ${authText}`)
    console.log(`   DeviceId: ${deviceText}`)

    // 解析 JSON
    let authData: any
    let deviceData: any
    
    try {
      authData = JSON.parse(authText)
      deviceData = JSON.parse(deviceText)
    } catch (e) {
      throw new Error(`JSON 解析失败: ${e}`)
    }

    console.log(`🔍 解析后的数据:`)
    console.log(`   authData:`, JSON.stringify(authData))
    console.log(`   deviceData:`, JSON.stringify(deviceData))

    // 提取值（兼容多种可能的响应格式）
    const authorization = authData?.val || authData?.value || authData?.data || ""
    const deviceId = deviceData?.val || deviceData?.value || deviceData?.data || ""

    console.log(`📊 提取的值:`)
    console.log(`   authorization: ${authorization}`)
    console.log(`   deviceId: ${deviceId}`)

    if (!authorization || !deviceId) {
      const errorMsg = []
      if (!authorization) errorMsg.push("authorization")
      if (!deviceId) errorMsg.push("deviceId")
      throw new Error(
        `BoxJs 中未找到有效的 ${errorMsg.join(" 和 ")}。\n\n` +
        `请确保已在 BoxJs 中配置:\n` +
        `• ninebot.authorization\n` +
        `• ninebot.deviceId\n\n` +
        `当前获取到的值:\n` +
        `authorization: ${authorization || "(空)"}\n` +
        `deviceId: ${deviceId || "(空)"}`
      )
    }

    console.log("✅ 鉴权信息同步成功")
    return { 
      success: true, 
      authorization, 
      deviceId,
      message: `成功从 BoxJs 同步鉴权信息`
    }

  } catch (error: any) {
    console.error("❌ 从 BoxJs 同步鉴权失败:", error)
    return { 
      success: false, 
      authorization: "",
      deviceId: "",
      message: `同步失败：${error.message || "未知错误"}` 
    }
  }
}

// 设置页面
function SettingsView() {
  const dismiss = Navigation.useDismiss()
  
  // 读取全屏偏好
  const storedFullscreen = Storage.get(FULLSCREEN_KEY)
  const [fullscreenPref, setFullscreenPref] = useState<boolean>(
    typeof storedFullscreen === "boolean" ? storedFullscreen : true
  )
  
  const toggleFullscreen = () => {
    const newValue = !fullscreenPref
    setFullscreenPref(newValue)
    Storage.set(FULLSCREEN_KEY, newValue)
  }

  // 读取设置
  const stored = Storage.get(SETTINGS_KEY) as NinebotSettings | null
  const initial: NinebotSettings = stored ?? defaultSettings

  // State
  const [authorization, setAuthorization] = useState(initial.authorization || "")
  const [deviceId, setDeviceId] = useState(initial.deviceId || "")
  const [userAgent, setUserAgent] = useState(initial.userAgent || defaultSettings.userAgent)
  
  const [enableBoxJs, setEnableBoxJs] = useState(initial.enableBoxJs ?? false)
  const [boxJsUrl, setBoxJsUrl] = useState(initial.boxJsUrl ?? "https://boxjs.com")
  
  const [refreshInterval, setRefreshInterval] = useState(
    initial.refreshInterval ?? 15
  )
  
  const [autoOpenBlindBox, setAutoOpenBlindBox] = useState(
    initial.autoOpenBlindBox ?? false
  )

  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // 保存设置
  const handleSave = () => {
    const newSettings: NinebotSettings = {
      authorization: (authorization ?? "").trim(),
      deviceId: (deviceId ?? "").trim(),
      userAgent: (userAgent ?? "").trim() || defaultSettings.userAgent,
      enableBoxJs: !!enableBoxJs,
      boxJsUrl: (boxJsUrl ?? "").trim() || "https://boxjs.com",
      refreshInterval: Number(refreshInterval) || 15,
      autoOpenBlindBox: !!autoOpenBlindBox,
    }

    Storage.set(SETTINGS_KEY, newSettings)
    Storage.set("ninebot.authorization", newSettings.authorization)
    Storage.set("ninebot.deviceId", newSettings.deviceId)
    Storage.set("ninebot.userAgent", newSettings.userAgent)
    
    Dialog.alert({
      title: "保存成功",
      message: "配置已更新，小组件将使用新的设置",
      buttonLabel: "确定"
    }).then(dismiss)
  }

  // 从 BoxJS 同步鉴权信息
  const handleSyncFromBoxJs = async () => {
    if (!boxJsUrl) {
      await Dialog.alert({ 
        title: "参数缺失", 
        message: "请先填写 BoxJs 地址", 
        buttonLabel: "确定" 
      })
      return
    }
    
    console.log("🔄 用户点击同步按钮")
    setSyncing(true)
    
    try {
      const result = await syncAuthFromBoxJs(boxJsUrl)
      setSyncing(false)
      
      console.log("🎯 同步结果:", result)
      
      if (result.success) {
        // 自动填充到输入框
        console.log(`📝 填充数据到输入框:`)
        console.log(`   authorization: ${result.authorization}`)
        console.log(`   deviceId: ${result.deviceId}`)
        
        setAuthorization(result.authorization)
        setDeviceId(result.deviceId)
        
        console.log("✅ 输入框已更新")
        
        await Dialog.alert({
          title: "同步成功",
          message: `${result.message}\n\n已自动填充到下方输入框\n请点击右上角"完成"按钮保存配置`,
          buttonLabel: "确定"
        })
      } else {
        await Dialog.alert({
          title: "同步失败",
          message: result.message,
          buttonLabel: "确定"
        })
      }
    } catch (error: any) {
      setSyncing(false)
      console.error("❌ 同步过程出错:", error)
      await Dialog.alert({
        title: "同步出错",
        message: `发生未预期的错误：${error.message || "未知错误"}`,
        buttonLabel: "确定"
      })
    }
  }

  // 一键清除功能
  const clearAuth = () => {
    setAuthorization("")
    Storage.remove("ninebot.authorization")
    Storage.remove(SETTINGS_KEY)
    Dialog.alert({ title: "清除成功", message: "Authorization 已清除", buttonLabel: "确定" })
  }

  const clearDeviceId = () => {
    setDeviceId("")
    Storage.remove("ninebot.deviceId")
    Storage.remove(SETTINGS_KEY)
    Dialog.alert({ title: "清除成功", message: "DeviceId 已清除", buttonLabel: "确定" })
  }

  // 关于信息
  const handleAbout = async () => {
    await Dialog.alert({
      title: "九号电动车助手",
      message:
        `作者：QinyRui\n` +
        `版本：v${VERSION}（${BUILD_DATE}）\n` +
        `Telegram：https://t.me/JiuHaoAPP\n` +
        `GitHub：github.com/QinyRui/QYR-`,
      buttonLabel: "关闭",
    })
  }

  // 打开 BoxJS 订阅
  const openBoxJsSubscription = async () => {
    try {
      await Safari.openURL(NINEBOT_BOXJS_SUB_URL)
    } catch (error) {
      try {
        await Pasteboard.setString(NINEBOT_BOXJS_JSON_URL)
        await Dialog.alert({
          title: "已复制链接",
          message: `BoxJS 配置链接已复制到剪贴板：\n\n${NINEBOT_BOXJS_JSON_URL}\n\n请在 BoxJS 中手动添加订阅。`,
          buttonLabel: "知道了",
        })
      } catch {
        await Dialog.alert({
          title: "打开失败",
          message: `无法打开 BoxJS 订阅页面\n\n链接：${NINEBOT_BOXJS_JSON_URL}`,
          buttonLabel: "确定",
        })
      }
    }
  }

  // 测试功能
  const handleTestApi = async () => {
    if (!authorization || !deviceId) {
      await Dialog.alert({ title: "参数缺失", message: "请先填写 Authorization 和 DeviceId", buttonLabel: "确定" })
      return
    }
    setTesting(true)
    const result = await testApiConnection(authorization, deviceId, userAgent)
    setTesting(false)
    await Dialog.alert({
      title: result.success ? "测试成功" : "测试失败",
      message: result.message,
      buttonLabel: "确定"
    })
  }

  const handleTestBoxJs = async () => {
    if (!enableBoxJs) return
    setTesting(true)
    const result = await testBoxJsConnection(boxJsUrl)
    setTesting(false)
    await Dialog.alert({
      title: result.success ? "连接成功" : "连接失败",
      message: result.message,
      buttonLabel: "确定"
    })
  }

  // UI
  return (
    <NavigationStack>
      <List
        navigationTitle={"九号电动车助手"}
        navigationBarTitleDisplayMode={"inline"}
        toolbar={{
          topBarLeading: [<Button title="关闭" action={dismiss} />],
          topBarTrailing: [
            <Button
              title={fullscreenPref ? "页面" : "弹层"}
              systemImage={fullscreenPref ? "rectangle.arrowtriangle.2.outward" : "rectangle"}
              action={toggleFullscreen}
            />,
            <Button title="完成" action={handleSave} />,
          ],
          bottomBar: [
            <Button systemImage="info.circle" title="关于本组件" action={handleAbout} foregroundStyle="secondaryLabel" />
          ],
        }}
      >
        {/* 模块安装 */}
        <Section 
          header={<Text font="body" fontWeight="semibold">📦 模块安装</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              使用前建议按顺序完成：{"\n"}
              1）在 BoxJS 中订阅配置（可同步鉴权信息）{"\n"}
              2）安装九号签到脚本到支持的客户端{"\n\n"}
              BoxJS 配置链接：{"\n"}
              {NINEBOT_BOXJS_JSON_URL}
            </Text>
          }
        >
          <Button
            title="订阅 BoxJS 配置"
            systemImage="shippingbox"
            action={openBoxJsSubscription}
          />
        </Section>

        {/* BoxJs 配置 */}
        <Section header={<Text font="body" fontWeight="semibold">🔗 BoxJs 配置</Text>}>
          <Toggle
            title="启用 BoxJs 读取鉴权"
            value={enableBoxJs}
            onChanged={(value) => {
              setEnableBoxJs(value)
              if (value && !boxJsUrl) setBoxJsUrl("https://boxjs.com")
            }}
          />
          {enableBoxJs ? (
            <>
              <HStack spacing={8} padding={{ vertical: 4 }}>
                <TextField 
                  title="BoxJs 地址" 
                  value={boxJsUrl} 
                  onChanged={setBoxJsUrl}
                  prompt="例如: https://boxjs.com"
                  frame={{ maxWidth: 'infinity' }}
                />
                <Button 
                  title="测试" 
                  systemImage="wifi" 
                  action={handleTestBoxJs}
                  padding={{ horizontal: 8 }}
                />
              </HStack>
              <Text font="caption2" foregroundStyle="secondaryLabel">
                点击右侧按钮可测试 BoxJs 连接状态
              </Text>
              {/* 新增：从 BoxJS 同步按钮 */}
              <Button
                title={syncing ? "同步中..." : "从 BoxJS 同步鉴权信息"}
                systemImage="arrow.triangle.2.circlepath"
                action={handleSyncFromBoxJs}
                disabled={syncing}
              />
              <Text font="caption2" foregroundStyle="secondaryLabel">
                📥 点击此按钮可自动从 BoxJS 拉取鉴权信息并填充到下方输入框
              </Text>
            </>
          ) : null}
        </Section>

        {/* 鉴权信息 */}
        <Section 
          header={<Text font="body" fontWeight="semibold">🔑 鉴权信息</Text>}
          footer={
            <>
              <Text font="footnote" foregroundStyle="secondaryLabel">
                {enableBoxJs 
                  ? "可使用上方「从 BoxJS 同步鉴权信息」按钮自动填充，或手动填写" 
                  : "请先运行签到脚本抓包获取 Authorization 和 Device ID"}
              </Text>
              {deviceId && !validateDeviceId(deviceId) ? (
                <Text font="caption2" foregroundStyle="red">
                  ⚠️ DeviceId 格式错误，应为 UUID 格式
                </Text>
              ) : null}
            </>
          }
        >
          {/* Authorization 字段 */}
          <HStack spacing={4} padding={{ vertical: 4 }}>
            <TextField
              title="Authorization 鉴权Token"
              value={authorization}
              prompt="直接粘贴抓包获取的令牌"
              onChanged={setAuthorization}
              frame={{ maxWidth: 'infinity' }}
            />
            <Button 
              title="一键清除" 
              systemImage="trash" 
              action={clearAuth}
              padding={{ horizontal: 4 }}
            />
          </HStack>

          {/* DeviceId 字段 */}
          <HStack spacing={4} padding={{ vertical: 4 }}>
            <TextField
              title="DeviceId 设备标识"
              value={deviceId}
              prompt="例如: 06965B02-DE89-45AB-9116-9B69923BFxxx"
              onChanged={setDeviceId}
              frame={{ maxWidth: 'infinity' }}
            />
            <Button 
              title="一键清除" 
              systemImage="trash" 
              action={clearDeviceId}
              padding={{ horizontal: 4 }}
            />
          </HStack>

          {/* User-Agent 字段 */}
          <HStack spacing={4} padding={{ vertical: 4 }}>
            <TextField
              title="User-Agent 请求头"
              value={userAgent}
              prompt="留空使用默认值"
              onChanged={setUserAgent}
              frame={{ maxWidth: 'infinity' }}
            />
          </HStack>

          <Button
            title={testing ? "测试中..." : "测试 API 连接"}
            systemImage="network"
            action={handleTestApi}
            disabled={testing}
          />
        </Section>

        {/* 小组件配置 */}
        <Section 
          header={<Text font="body" fontWeight="semibold">⚙️ 小组件配置</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              刷新间隔：小组件自动刷新的时间间隔（分钟），建议不小于15分钟{"\n"}
              自动开启盲盒：小组件刷新时自动开启到期的盲盒
            </Text>
          }
        >
          {/* 刷新间隔 */}
          <HStack spacing={8} padding={{ vertical: 4 }} alignment="center">
            <TextField
              title="刷新间隔（分钟）"
              value={String(refreshInterval)}
              onChanged={(v) => setRefreshInterval(Number(v) || 15)}
              keyboardType="numberPad"
              frame={{ maxWidth: 'infinity' }}
            />
            <Text font="caption2" foregroundStyle="secondaryLabel">
              当前：{refreshInterval} 分钟
            </Text>
          </HStack>
          
          {/* 自动开启盲盒 */}
          <Toggle
            title="自动开启盲盒"
            value={autoOpenBlindBox}
            onChanged={setAutoOpenBlindBox}
          />
          <Text font="caption2" foregroundStyle="secondaryLabel">
            🎁 启用后，小组件刷新时会自动开启所有可开启的盲盒
          </Text>
        </Section>

        {/* 版本信息 */}
        <Section>
          <Text font="caption2" foregroundStyle="tertiaryLabel" multilineTextAlignment="center">
            v{VERSION} · {BUILD_DATE} | 适配 iOS 17+
          </Text>
        </Section>

      </List>
    </NavigationStack>
  )
}

// App / Run
type AppProps = { interactiveDismissDisabled?: boolean }
function App(_props: AppProps) {
  return <SettingsView />
}

function readFullscreenPrefForRun(): boolean {
  try {
    const v = Storage.get(FULLSCREEN_KEY)
    if (typeof v === "boolean") return v
  } catch { }
  return true
}

async function run() {
  const fullscreen = readFullscreenPrefForRun()
  await Navigation.present({
    element: <App interactiveDismissDisabled />,
    ...(fullscreen ? { modalPresentationStyle: "fullScreen" } : {}),
  })
  Script.exit()
}

run()