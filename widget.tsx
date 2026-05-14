import {
  Widget,
  Script,
  VStack,
  HStack,
  ZStack,
  Spacer,
  Text,
  Image,
  Circle,
  Rectangle,
} from "scripting"

declare const Device: any

declare const FileManager: any
declare const Location: any
declare const Photos: any
declare const CalendarEvent: any
declare const fetch: any

function isMeaningfulName(value: any) {
  const text = String(value || "").trim()
  return Boolean(text && text !== "定位中" && text !== "等待定位" && text !== "定位失败")
}

function placemarkHasDetailedAddress(placemark: any) {
  if (!placemark) return false
  const province = placemark.administrativeArea || placemark.state
  const city = placemark.locality || placemark.city
  const district = placemark.subLocality || placemark.subAdministrativeArea || placemark.district
  const fine = placemark.neighborhood || placemark.quarter || placemark.thoroughfare || placemark.name
  return Boolean(isMeaningfulName(province) && (isMeaningfulName(city) || isMeaningfulName(district)) && isMeaningfulName(fine))
}

async function callReverseGeocode(options: { latitude: number; longitude: number; locale?: string }): Promise<any[] | null> {
  const nativeFn = (globalThis as any)?.reverseGeocode
  let nativeResult: any[] | null = null
  if (typeof nativeFn === "function") {
    try {
      nativeResult = await nativeFn(options)
      const native = nativeResult?.[0]
      const hasSeparateStreet = isMeaningfulName(native?.thoroughfare) && native?.thoroughfare !== native?.neighborhood && native?.thoroughfare !== native?.name
      const hasDistrict = isMeaningfulName(native?.subLocality) || isMeaningfulName(native?.subAdministrativeArea) || /[区县旗]$/.test(String(native?.locality || ""))
      if (placemarkHasDetailedAddress(native) && hasDistrict && hasSeparateStreet) return nativeResult
    } catch {}
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(options.latitude))}&lon=${encodeURIComponent(String(options.longitude))}&accept-language=zh-CN&zoom=18&addressdetails=1`
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Scripting-CaiyunWeather-Widget/1.0",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    })
    if (!response.ok) throw new Error(`位置名称解析失败 HTTP ${response.status}`)
    const json = await response.json()
    const address = json?.address || {}
    const city = address.city || address.town || address.village || address.municipality || ""
    const area = address.city_district || address.district || address.county || ""
    const block = address.neighbourhood || address.quarter || address.suburb || address.residential || address.city_block || address.hamlet || ""
    const road = address.road || address.pedestrian || address.footway || address.cycleway || address.path || ""
    const poi = address.amenity || address.building || address.shop || address.office || address.tourism || ""
    const fineName = road || block || poi || json?.name || ""
    const displayName = poi || block || road || area || city || json?.display_name || ""
    if (!city && !area && !displayName && !address.state) return nativeResult
    return [{
      locality: city || address.state || "",
      administrativeArea: address.state || city || "",
      subAdministrativeArea: address.county || "",
      subLocality: area,
      neighborhood: block,
      quarter: address.quarter || "",
      thoroughfare: road,
      subThoroughfare: address.house_number || "",
      name: displayName,
    }]
  } catch (error) {
    if (nativeResult) return nativeResult
    throw error
  }
}

type LayoutOffset = { x?: number; y?: number }

type StyleConfig = {
  refreshInterval?: string | number
  layout?: {
    medium?: {
      left?: LayoutOffset
      right?: LayoutOffset
    }
    large?: {
      left?: LayoutOffset
      right?: LayoutOffset
    }
  }
  global?: { size?: number }
  [key: string]: any
}

type WeatherFuture = {
  week: string
  min: number
  max: number
  ico: string
}

type WeatherInfo = {
  alertWeatherTitle?: string
  weatherDesc?: string
  minTemperature?: number
  maxTemperature?: number
  future?: WeatherFuture[]
  bodyFeelingTemperature?: number
  weatherIco?: string
  humidity?: string
  windStr?: string
  comfort?: string
  ultraviolet?: string
  aqiInfo?: string
  sunrise?: string
  sunset?: string
  updatedAt?: number
}

type PoetryInfo = {
  data?: {
    content?: string
    origin?: {
      dynasty?: string
      author?: string
    }
  }
}

type ScheduleInfo = {
  title: string
  timeText: string
}

type LocationData = {
  latitude: number
  longitude: number
  administrativeArea?: string
  subAdministrativeArea?: string
  locality: string
  subLocality: string
  street?: string
  neighborhood?: string
  quarter?: string
  name?: string
  resolvedAt?: number
}

const locale = "zh_cn"
const colorMode = false
const bgColorStr = "#000000"
const weekTitle = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
const weekTitleShort = ["日", "一", "二", "三", "四", "五", "六"]
const zodiacAnimals = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]
const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
const yellowBlackDays = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"]
const twentyEightMansions = ["角", "亢", "氐", "房", "心", "尾", "箕", "斗", "牛", "女", "虚", "危", "室", "壁", "奎", "娄", "胃", "昴", "毕", "觜", "参", "井", "鬼", "柳", "星", "张", "翼", "轸"]
const solarTerms = ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"]
const solarTermOffsets = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758]
const greetingText = {
  nightGreeting: "🍀 QinyRui~ ",
  morningGreeting: "💫,早上心情美美哒~",
  noonGreeting: "🥳,中午好呀~",
  afternoonGreeting: "🐡,下午好呀~",
  eveningGreeting: "🐳,傍晚好呀!",
  nightText: "🌙,晚上好呀!",
}
const weatherIcos: Record<string, string> = {
  CLEAR_DAY: "sun.max.fill",
  CLEAR_NIGHT: "moon.fill",
  PARTLY_CLOUDY_DAY: "cloud.sun.fill",
  PARTLY_CLOUDY_NIGHT: "cloud.moon.fill",
  CLOUDY: "cloud.fill",
  LIGHT_HAZE: "sun.haze.fill",
  MODERATE_HAZE: "sun.haze.fill",
  HEAVY_HAZE: "sun.haze.fill",
  LIGHT_RAIN: "cloud.drizzle.fill",
  MODERATE_RAIN: "cloud.rain.fill",
  HEAVY_RAIN: "cloud.rain.fill",
  STORM_RAIN: "cloud.heavyrain.fill",
  FOG: "cloud.fog.fill",
  LIGHT_SNOW: "cloud.snow.fill",
  MODERATE_SNOW: "cloud.snow.fill",
  HEAVY_SNOW: "cloud.snow.fill",
  STORM_SNOW: "wind.snow.fill",
  DUST: "cloud.dust.fill",
  SAND: "cloud.dust.fill",
  WIND: "wind",
  SUNSET: "sunset.fill",
  SUNRISE: "sunrise.fill",
}

const lunarInfo = [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0]

const scriptName = Script.name
const documentsDir = FileManager.documentsDirectory
const appGroupDir = FileManager.appGroupDocumentsDirectory
const keyCachePath = `${documentsDir}/caiyun_api_token.json`
const keyCachePathAppGroup = `${appGroupDir}/caiyun_api_token.json`
const locCachePath = `${documentsDir}/caiyun_location_config.json`
const styleCachePath = `${documentsDir}/caiyun_style_config_v3.json`
const styleCachePathAppGroup = `${appGroupDir}/caiyun_style_config_v3.json`
const getPreferredBgPath = (family: string) => `${appGroupDir}/${scriptName}_${family}.jpg`
const getBgMetaPath = (family: string) => `${appGroupDir}/${scriptName}_background_${family}.json`
const getLegacyBgPath = (family: string) => `${documentsDir}/${scriptName}_${family}.jpg`
const weatherCachePath = `${appGroupDir}/cache_weather.json`
const locationCachePath = `${appGroupDir}/cache_loc.json`
const widgetDebugLogPath = `${appGroupDir}/widget_debug.log`
const widgetReloadControlPath = `${appGroupDir}/widget_reload_control.json`

async function getCurrentLocationInfo() {
  const globalLocation = (globalThis as any)?.location
  if (globalLocation && typeof globalLocation.latitude === "number" && typeof globalLocation.longitude === "number") {
    return globalLocation
  }
  try {
    const requestedLocation = await Location.requestCurrent()
    if (requestedLocation && typeof requestedLocation.latitude === "number" && typeof requestedLocation.longitude === "number") {
      return requestedLocation
    }
  } catch (error) {
    appendDebugLog("request current location failed", {
      message: String((error as any)?.message || error),
    })
  }
  return null
}

const Cache = {
  read<T = any>(path: string): T | null {
    if (!FileManager.existsSync(path)) return null
    try {
      return JSON.parse(FileManager.readAsStringSync(path)) as T
    } catch {
      return null
    }
  },
  write(path: string, data: any) {
    FileManager.writeAsStringSync(path, JSON.stringify(data))
  },
}

function appendDebugLog(message: string, payload?: unknown) {
  try {
    const line = `[${new Date().toISOString()}] ${message}${payload !== undefined ? ` ${JSON.stringify(payload)}` : ""}`
    const current = FileManager.existsSync(widgetDebugLogPath) ? FileManager.readAsStringSync(widgetDebugLogPath) : ""
    const next = `${current}${current ? "\n" : ""}${line}`
    const rows = next.split("\n")
    FileManager.writeAsStringSync(widgetDebugLogPath, rows.slice(-120).join("\n"))
  } catch {}
}

function readJson<T>(path: string): T | null {
  if (!FileManager.existsSync(path)) return null
  try {
    return JSON.parse(FileManager.readAsStringSync(path)) as T
  } catch {
    return null
  }
}

function getWidgetReloadControl() {
  return readJson<{
    requestedAt?: number
    source?: string
    scriptName?: string
  }>(widgetReloadControlPath)
}

function hasRecentForceReloadRequest(now: number) {
  const control = getWidgetReloadControl()
  if (!control?.requestedAt) return false
  const burstUntil = Number((control as any).burstUntil || 0)
  if (burstUntil && now <= burstUntil) return true
  return now - Number(control.requestedAt) <= 10 * 60 * 1000
}

function hasValidCoordinates(data?: Partial<LocationData> | null) {
  return Boolean(
    data &&
    Number.isFinite(Number(data.latitude)) &&
    Number.isFinite(Number(data.longitude)) &&
    (Number(data.latitude) !== 0 || Number(data.longitude) !== 0)
  )
}

function hasReadableLocationName(data?: Partial<LocationData> | null) {
  if (!data) return false
  return [data.administrativeArea, data.locality, data.subLocality, data.street, data.neighborhood, data.name]
    .map((item) => String(item || "").trim())
    .some(isMeaningfulName)
}

function hasFullLocationName(data?: Partial<LocationData> | null) {
  if (!data) return false
  const province = String(data.administrativeArea || "").trim()
  const city = String(data.locality || "").trim()
  const district = String(data.subLocality || data.subAdministrativeArea || "").trim()
  const normalizedDistrict = district || (province && province.endsWith("市") && /[区县旗]$/.test(city) ? city : "")
  const fine = [data.street, data.neighborhood, data.quarter, data.name]
    .map((item) => String(item || "").trim())
    .find((item) => Boolean(isMeaningfulName(item) && item !== province && item !== city && item !== normalizedDistrict))
  return Boolean((province || city) && (normalizedDistrict || city) && fine)
}

function extractLocationData(raw: any): LocationData | null {
  if (!raw) return null
  const data = raw.locationData || raw
  if (!hasValidCoordinates(data)) return null
  return {
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    administrativeArea: data.administrativeArea ? String(data.administrativeArea) : undefined,
    subAdministrativeArea: data.subAdministrativeArea ? String(data.subAdministrativeArea) : undefined,
    locality: String(data.locality || ""),
    subLocality: String(data.subLocality || ""),
    street: data.street ? String(data.street) : undefined,
    neighborhood: data.neighborhood ? String(data.neighborhood) : undefined,
    quarter: data.quarter ? String(data.quarter) : undefined,
    name: data.name ? String(data.name) : undefined,
    resolvedAt: data.resolvedAt,
  }
}

function applyPlacemarkToLocationData(base: LocationData, placemark: any): LocationData {
  let provinceName = [placemark.administrativeArea, placemark.state]
    .map((item: any) => String(item || "").trim())
    .find(isMeaningfulName) || base.administrativeArea || ""
  let cityName = [placemark.locality, placemark.city, placemark.municipality]
    .map((item: any) => String(item || "").trim())
    .find((item: string) => Boolean(isMeaningfulName(item) && item !== provinceName)) || base.locality || provinceName || ""
  let districtName = [placemark.subLocality, placemark.subAdministrativeArea, placemark.district]
    .map((item: any) => String(item || "").trim())
    .find((item: string) => Boolean(isMeaningfulName(item) && item !== provinceName && item !== cityName)) || base.subLocality || base.subAdministrativeArea || ""

  // iOS 原生反向地理编码在直辖市中常把“区县”放进 locality。
  // 例如：administrativeArea=上海市, locality=宝山区，此处归一成 省/市=上海市，区=宝山区。
  if (provinceName && provinceName.endsWith("市") && cityName && /[区县旗]$/.test(cityName) && !districtName) {
    districtName = cityName
    cityName = provinceName
  }

  const neighborhoodName = [placemark.neighborhood, placemark.quarter]
    .map((item: any) => String(item || "").trim())
    .find((item: string) => Boolean(isMeaningfulName(item) && item !== provinceName && item !== cityName && item !== districtName)) || base.neighborhood || base.quarter || ""
  const streetName = [placemark.thoroughfare, placemark.subThoroughfare, placemark.name]
    .map((item: any) => String(item || "").trim())
    .find((item: string) => Boolean(isMeaningfulName(item) && item !== provinceName && item !== cityName && item !== districtName && item !== neighborhoodName)) || base.street || base.name || ""
  return {
    ...base,
    administrativeArea: provinceName,
    subAdministrativeArea: String(placemark.subAdministrativeArea || base.subAdministrativeArea || ""),
    locality: cityName,
    subLocality: districtName,
    neighborhood: neighborhoodName,
    quarter: String(placemark.quarter || base.quarter || ""),
    street: streetName || neighborhoodName,
    name: streetName || neighborhoodName || districtName || cityName || provinceName,
    resolvedAt: Date.now(),
  }
}

async function resolveLocationNameIfNeeded(data: LocationData, force = false) {
  if (!hasValidCoordinates(data)) return data
  if (!force && hasFullLocationName(data)) return data
  try {
    const placemarks = await callReverseGeocode({ latitude: Number(data.latitude), longitude: Number(data.longitude), locale })
    if (placemarks?.[0]) {
      const resolved = applyPlacemarkToLocationData(data, placemarks[0])
      Cache.write(locationCachePath, resolved)
      appendDebugLog("resolved cached location name", resolved)
      return resolved
    }
  } catch (error) {
    appendDebugLog("reverse geocode cached location failed", {
      message: String((error as any)?.message || error),
      data,
    })
  }
  return data
}

function getSavedApiKey() {
  const appGroupKey = readJson<{ apiKey?: string }>(keyCachePathAppGroup)?.apiKey
  if (appGroupKey && String(appGroupKey).trim()) return String(appGroupKey).trim()

  const documentKey = readJson<{ apiKey?: string }>(keyCachePath)?.apiKey
  if (documentKey && String(documentKey).trim()) {
    Cache.write(keyCachePathAppGroup, { apiKey: String(documentKey).trim() })
    return String(documentKey).trim()
  }
  return null
}

function getSavedLocationConfig() {
  const documentConfig = readJson<{ lockLocation?: boolean; locationData?: LocationData }>(locCachePath)
  const appGroupRaw = readJson<any>(locationCachePath)
  const documentLocation = extractLocationData(documentConfig)
  const appGroupLocation = extractLocationData(appGroupRaw)
  return {
    lockLocation: Boolean(documentConfig?.lockLocation),
    locationData: documentLocation || appGroupLocation || undefined,
  }
}

function getSavedStyleConfig(): StyleConfig {
  const appGroupStyle = readJson<StyleConfig>(styleCachePathAppGroup)
  if (appGroupStyle) return appGroupStyle
  const documentStyle = readJson<StyleConfig>(styleCachePath)
  if (documentStyle) {
    Cache.write(styleCachePathAppGroup, documentStyle)
    return documentStyle
  }
  return { global: { size: 1.0 } }
}

let apiKey = getSavedApiKey()
let locationData: LocationData = { latitude: 0, longitude: 0, locality: "等待定位", subLocality: "" }
let lockLocation = false
const savedLocConfig = getSavedLocationConfig()
if (savedLocConfig) {
  lockLocation = !!savedLocConfig.lockLocation
  if (savedLocConfig.locationData) locationData = savedLocConfig.locationData
}
const styleConfig = getSavedStyleConfig()

function s(size: number, type?: string) {
  let scale = 1.0
  if (type && styleConfig[type] && styleConfig[type].size !== undefined) {
    scale = styleConfig[type].size
  } else if (styleConfig.global && styleConfig.global.size !== undefined) {
    scale = styleConfig.global.size
  }
  return Math.round(size * scale)
}

function isReadableConfiguredColor(value: string) {
  const color = String(value || "").trim().toLowerCase()
  if (!color || color === "transparent") return false
  if (color.startsWith("rgba")) {
    const parts = color.match(/[\d.]+/g)?.map(Number) || []
    const alpha = parts[3] ?? 1
    if (alpha < 0.35) return false
    const [r = 255, g = 255, b = 255] = parts
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.28
  }
  if (color.startsWith("rgb")) {
    const [r = 255, g = 255, b = 255] = color.match(/[\d.]+/g)?.map(Number) || []
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.28
  }
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const r = parseInt(color[1] + color[1], 16)
    const g = parseInt(color[2] + color[2], 16)
    const b = parseInt(color[3] + color[3], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.28
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.28
  }
  return true
}

function c(defaultColor: string, type?: string) {
  const configuredColor = type && styleConfig[type] && styleConfig[type].color ? String(styleConfig[type].color) : ""
  if (configuredColor && isReadableConfiguredColor(configuredColor)) return configuredColor
  return defaultColor
}

function clampLayoutOffset(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(-8, Math.min(8, value))
}

function offsetStyle(widgetType: "medium" | "large", sideType: "left" | "right") {
  const offset = styleConfig.layout?.[widgetType]?.[sideType]
  const x = clampLayoutOffset(offset?.x || 0)
  const y = clampLayoutOffset(offset?.y || 0)
  return {
    padding: {
      leading: x > 0 ? x : 0,
      trailing: x < 0 ? -x : 0,
      top: y > 0 ? y : 0,
      bottom: y < 0 ? -y : 0,
    },
  }
}

function getBackgroundPath(family: string) {
  const meta = readJson<{ path?: string; fallbackPath?: string }>(getBgMetaPath(family))
  if (meta?.path && FileManager.existsSync(meta.path)) return meta.path
  if (meta?.fallbackPath && FileManager.existsSync(meta.fallbackPath)) return meta.fallbackPath
  if (FileManager.existsSync(getPreferredBgPath(family))) return getPreferredBgPath(family)
  if (FileManager.existsSync(getLegacyBgPath(family))) return getLegacyBgPath(family)
  return null
}

async function ensureBackgroundMigrated() {
  const families = ["systemMedium", "systemLarge"]
  for (const family of families) {
    try {
      const preferred = getPreferredBgPath(family)
      const legacy = getLegacyBgPath(family)
      const meta = getBgMetaPath(family)
      if (!FileManager.existsSync(preferred) && FileManager.existsSync(legacy)) {
        FileManager.copyFileSync(legacy, preferred)
      }
      if (!FileManager.existsSync(meta) && FileManager.existsSync(preferred)) {
        Cache.write(meta, {
          path: preferred,
          fallbackPath: preferred,
          updatedAt: Date.now(),
        })
      }
    } catch {}
  }
}

function getBatteryText() {
  try {
    const raw = Number(Device?.batteryLevel)
    if (Number.isFinite(raw) && raw >= 0) {
      return `电量 ${Math.round(raw * 100)}%`
    }
  } catch {}
  return "电量 --%"
}

function getDisplayLocationText() {
  let province = String(locationData.administrativeArea || "").trim()
  let city = String(locationData.locality || "").trim()
  let district = String(locationData.subLocality || locationData.subAdministrativeArea || "").trim()

  // 直辖市常见缓存：administrativeArea=上海市，locality=宝山区。
  // 显示时归一为：上海市/宝山区/地点名称。
  if (province && province.endsWith("市") && city && /[区县旗]$/.test(city) && !district) {
    district = city
    city = province
  }

  const street = String(locationData.street || "").trim()
  const neighborhood = String(locationData.neighborhood || locationData.quarter || "").trim()
  const name = String(locationData.name || "").trim()
  const area = district || city
  const fineName = [name, street, neighborhood]
    .map((item) => String(item || "").trim())
    .find((item) => Boolean(isMeaningfulName(item) && item !== province && item !== city && item !== district))
  const parts = [province || city, area, fineName]
    .map((item) => String(item || "").trim())
    .filter((item, index, arr) => isMeaningfulName(item) && arr.indexOf(item) === index)
  if (parts.length === 0) {
    const hasCoordinates = Number.isFinite(Number(locationData.latitude)) && Number.isFinite(Number(locationData.longitude))
    return hasCoordinates && (locationData.latitude !== 0 || locationData.longitude !== 0)
      ? `${Number(locationData.latitude).toFixed(2)}, ${Number(locationData.longitude).toFixed(2)}`
      : "定位获取中"
  }
  return parts.join("/")
}

async function getJson(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.json()
}

async function getLocation(): Promise<LocationData> {
  const savedConfig = getSavedLocationConfig()
  if (savedConfig?.locationData) {
    locationData = {
      ...locationData,
      ...savedConfig.locationData,
    }
  }
  const cached = Cache.read<LocationData>(locationCachePath)
  if (cached) {
    locationData = {
      ...locationData,
      ...cached,
    }
  }
  const liveLocation = await getCurrentLocationInfo()
  if (lockLocation || !liveLocation) {
    locationData = await resolveLocationNameIfNeeded(locationData)
    appendDebugLog("using cached/saved location only", {
      lockLocation,
      hasGlobalLocation: Boolean(liveLocation),
      locationData,
    })
    return locationData
  }
  try {
    const l = liveLocation
    locationData = await resolveLocationNameIfNeeded({
      latitude: l.latitude,
      longitude: l.longitude,
      locality: locationData.locality || "",
      subLocality: locationData.subLocality || "",
      street: locationData.street,
      name: locationData.name,
      resolvedAt: locationData.resolvedAt,
    }, true)
    Cache.write(locationCachePath, locationData)
    appendDebugLog("resolved live location", locationData)
    return locationData
  } catch (error) {
    appendDebugLog("location resolve failed", {
      message: String((error as any)?.message || error),
      fallbackLocation: locationData,
    })
  }
  return locationData
}

export async function safeGetWeather(forceRefresh = false): Promise<WeatherInfo> {
  const location = await getLocation()
  const cachedWeather = Cache.read<WeatherInfo>(weatherCachePath) || {}
  if (!apiKey) {
    appendDebugLog("weather skipped: missing api key, using cache")
    return cachedWeather
  }
  const url = `https://api.caiyunapp.com/v2.5/${apiKey}/${location.longitude},${location.latitude}/weather.json?alert=true`

  let data: any
  try {
    data = await getJson(url)
  } catch {
    return cachedWeather
  }

  if (!data || data.status !== "ok") return cachedWeather

  const info: WeatherInfo = {}
  if (data.result?.alert?.content) info.alertWeatherTitle = data.result.alert.content.title

  const daily = data.result?.daily
  if (daily?.temperature?.[0]) {
    info.minTemperature = Math.round(daily.temperature[0].min)
    info.maxTemperature = Math.round(daily.temperature[0].max)
  }

  if (daily?.temperature && daily?.skycon) {
    info.future = []
    for (let i = 1; i <= 3; i++) {
      if (daily.temperature[i] && daily.skycon[i]) {
        const dateStr = daily.temperature[i].date
        const dayNum = parseInt(String(dateStr).split("-")[2])
        info.future.push({
          week: `${dayNum}日`,
          min: Math.round(daily.temperature[i].min),
          max: Math.round(daily.temperature[i].max),
          ico: weatherIcos[daily.skycon[i].value] || "sun.max.fill",
        })
      }
    }
  }

  const rt = data.result?.realtime
  if (rt) {
    info.bodyFeelingTemperature = Math.round(rt.apparent_temperature)
    info.weatherIco = weatherIcos[rt.skycon] || "sun.max.fill"
    info.humidity = Math.round(rt.humidity * 100) + "%"
    if (rt.wind) {
      info.windStr = `${getWindDirection(rt.wind.direction)} ${getWindLevel(rt.wind.speed)}`
    }
    if (rt.life_index?.comfort) info.comfort = rt.life_index.comfort.desc
    if (rt.life_index?.ultraviolet) info.ultraviolet = rt.life_index.ultraviolet.desc
    if (rt.air_quality?.aqi?.chn !== undefined) info.aqiInfo = airQuality(rt.air_quality.aqi.chn)
  }
  if (data.result?.forecast_keypoint) info.weatherDesc = data.result.forecast_keypoint
  if (daily?.astro?.[0]) {
    info.sunrise = daily.astro[0].sunrise.time
    info.sunset = daily.astro[0].sunset.time
  }

  info.updatedAt = Date.now()
  Cache.write(weatherCachePath, info)
  return info
}

function safeGetLunarStr() {
  try {
    const o = getLunarDate_Precise(new Date())
    return o.month + o.day
  } catch {
    return ""
  }
}

async function safeGetPoetry(): Promise<PoetryInfo | null> {
  try {
    return await getJson("https://v2.jinrishici.com/sentence")
  } catch {
    return null
  }
}

async function safeGetSchedules(): Promise<ScheduleInfo[]> {
  try {
    const start = new Date()
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    const events = await CalendarEvent.getAll(start, end)
    return events
      .slice(0, 10)
      .filter((e: any) => !String(e.title || "").startsWith("Canceled") && (e.isAllDay || e.startDate > new Date()))
      .map((e: any) => ({
        title: e.title,
        timeText: e.isAllDay ? "全天" : `${pad(e.startDate.getHours())}:${pad(e.startDate.getMinutes())}`,
      }))
  } catch {
    return []
  }
}

function provideGreeting(d: Date) {
  const h = d.getHours()
  if (h < 5 || h >= 23) return greetingText.nightGreeting
  if (h < 11) return greetingText.morningGreeting
  if (h < 13) return greetingText.noonGreeting
  if (h < 18) return greetingText.afternoonGreeting
  return greetingText.nightText
}

function getDateStr(d: Date) {
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${d.getDate()}日`
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function getWindLevel(speed: number) {
  if (speed < 1) return "0级"
  if (speed < 6) return "1级"
  if (speed < 12) return "2级"
  if (speed < 20) return "3级"
  if (speed < 29) return "4级"
  if (speed < 39) return "5级"
  if (speed < 50) return "6级"
  if (speed < 62) return "7级"
  if (speed < 75) return "8级"
  if (speed < 89) return "9级"
  if (speed < 103) return "10级"
  if (speed < 118) return "11级"
  return "12级"
}

function getWindDirection(direction: number) {
  if (direction < 22.5) return "北风"
  if (direction < 67.5) return "东北风"
  if (direction < 112.5) return "东风"
  if (direction < 157.5) return "东南风"
  if (direction < 202.5) return "南风"
  if (direction < 247.5) return "西南风"
  if (direction < 292.5) return "西风"
  if (direction < 337.5) return "西北风"
  return "北风"
}

function airQuality(v: number) {
  if (v <= 50) return "优秀"
  if (v <= 100) return "良好"
  if (v <= 150) return "轻度"
  if (v <= 200) return "中度"
  if (v <= 300) return "重度"
  return "严重"
}

function getWeekOfYear(d: Date) {
  const D = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = D.getUTCDay() || 7
  D.setUTCDate(D.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(D.getUTCFullYear(), 0, 1))
  return Math.ceil((((D.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getDayOfYear(d: Date) {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)
}

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days = last.getDate()
  const start = first.getDay()
  const grid: Array<Array<number | null>> = []
  let week: Array<number | null> = Array(start).fill(null)
  for (let i = 1; i <= days; i++) {
    week.push(i)
    if (week.length === 7) {
      grid.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    grid.push(week)
  }
  return grid
}

function getSolarTerm(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const targetUtc = Date.UTC(year, month, day)
  const base = Date.UTC(1900, 0, 6, 2, 5)
  const off = 31556925974.7 * (year - 1900)
  for (let i = 0; i < 24; i++) {
    const term = new Date(base + off + solarTermOffsets[i] * 60000)
    const termUtc = Date.UTC(term.getUTCFullYear(), term.getUTCMonth(), term.getUTCDate())
    if (termUtc === targetUtc) return solarTerms[i]
  }
  return null
}

function getSolarTermDate(year: number, index: number) {
  const base = Date.UTC(1900, 0, 6, 2, 5)
  const off = 31556925974.7 * (year - 1900)
  return new Date(base + off + solarTermOffsets[index] * 60000)
}

function getNextSolarTermInfo(date: Date) {
  const nowUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const year = date.getFullYear()
  let nextTerm: { term: string; daysLeft: number } | null = null
  let minDays = Infinity
  for (let y = year; y <= year + 1; y++) {
    for (let i = 0; i < 24; i++) {
      const termDate = getSolarTermDate(y, i)
      const termUtc = Date.UTC(termDate.getUTCFullYear(), termDate.getUTCMonth(), termDate.getUTCDate())
      if (termUtc > nowUtc) {
        const days = Math.floor((termUtc - nowUtc) / (1000 * 60 * 60 * 24))
        if (days < minDays) {
          minDays = days
          nextTerm = { term: solarTerms[i], daysLeft: days }
        }
      }
    }
  }
  return nextTerm
}

function getNextFestivalInfo(date: Date) {
  const year = date.getFullYear()
  const fixedFestivals = [
    { name: "元旦", month: 1, day: 1 },
    { name: "情人节", month: 2, day: 14 },
    { name: "劳动节", month: 5, day: 1 },
    { name: "儿童节", month: 6, day: 1 },
    { name: "国庆节", month: 10, day: 1 },
    { name: "圣诞节", month: 12, day: 25 },
  ]
  const specialFestivals = [
    { name: "母亲节", date: nthWeekdayOfMonth(year, 4, 0, 2) },
    { name: "父亲节", date: nthWeekdayOfMonth(year, 5, 0, 3) },
  ]
  const all = [
    ...fixedFestivals.map((item) => ({ name: item.name, date: new Date(year, item.month - 1, item.day) })),
    ...specialFestivals,
    ...fixedFestivals.map((item) => ({ name: item.name, date: new Date(year + 1, item.month - 1, item.day) })),
    { name: "母亲节", date: nthWeekdayOfMonth(year + 1, 4, 0, 2) },
    { name: "父亲节", date: nthWeekdayOfMonth(year + 1, 5, 0, 3) },
  ]
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  let result: { name: string; daysLeft: number } | null = null
  for (const item of all) {
    const target = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate()).getTime()
    const daysLeft = Math.round((target - today) / 86400000)
    if (daysLeft >= 0 && (!result || daysLeft < result.daysLeft)) {
      result = { name: item.name, daysLeft }
    }
  }
  return result
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(year, month, 1)
  const offset = (7 + weekday - first.getDay()) % 7
  return new Date(year, month, 1 + offset + (nth - 1) * 7)
}

function lYearDays(y: number) {
  let i
  let sum = 348
  for (i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0
  return sum + ((lunarInfo[y - 1900] & 0xf) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0)
}

function getLunarDate_Precise(date: Date) {
  const lm = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"]
  const ld = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"]
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  let offset = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000)
  let year = 1900
  while (year < 2100 && offset >= lYearDays(year)) {
    offset -= lYearDays(year)
    year++
  }
  let leapMonth = lunarInfo[year - 1900] & 0xf
  let isLeap = false
  let month
  let monthDays
  for (month = 1; month <= 12; month++) {
    if (leapMonth > 0 && month === leapMonth + 1 && !isLeap) {
      monthDays = (lunarInfo[year - 1900] & 0x10000) ? 30 : 29
      if (offset < monthDays) {
        isLeap = true
        break
      }
      offset -= monthDays
      isLeap = true
    } else {
      monthDays = (lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29
      if (offset < monthDays) break
      offset -= monthDays
    }
  }
  let dayIndex = Math.floor(offset)
  if (dayIndex < 0) dayIndex = 0
  if (dayIndex >= ld.length) dayIndex = ld.length - 1
  const monthName = leapMonth > 0 && month === leapMonth + 1 && isLeap ? `闰${lm[leapMonth - 1]}` : lm[(month || 1) - 1]
  return { month: monthName, day: ld[dayIndex] }
}

function getStemBranchDay(date: Date) {
  const baseDate = new Date(1900, 0, 31)
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000))
  const stemIndex = daysDiff % 10
  const branchIndex = daysDiff % 12
  return heavenlyStems[(stemIndex + 10) % 10] + earthlyBranches[(branchIndex + 12) % 12]
}

function getYellowBlackDay(date: Date) {
  const lunarDate = getLunarDate_Precise(date)
  const monthMap: Record<string, number> = { "正月":1,"二月":2,"三月":3,"四月":4,"五月":5,"六月":6,"七月":7,"八月":8,"九月":9,"十月":10,"冬月":11,"腊月":12 }
  const dayMap: Record<string, number> = { "初一":1,"初二":2,"初三":3,"初四":4,"初五":5,"初六":6,"初七":7,"初八":8,"初九":9,"初十":10,"十一":11,"十二":12,"十三":13,"十四":14,"十五":15,"十六":16,"十七":17,"十八":18,"十九":19,"二十":20,"廿一":21,"廿二":22,"廿三":23,"廿四":24,"廿五":25,"廿六":26,"廿七":27,"廿八":28,"廿九":29,"三十":30 }
  const m = monthMap[lunarDate.month.replace("闰", "")] || 1
  const d = dayMap[lunarDate.day] || 1
  return yellowBlackDays[(m + d - 2) % 12]
}

function getMansion(date: Date) {
  const baseDate = new Date(1900, 0, 31)
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000))
  return twentyEightMansions[(daysDiff % 28 + 28) % 28]
}

function isAuspiciousDay(date: Date) {
  const yb = getYellowBlackDay(date)
  const man = getMansion(date)
  const goodYb = ["除", "危", "定", "执", "成", "开"]
  const goodMan = ["角", "房", "尾", "箕", "斗", "室", "壁", "娄", "胃", "毕", "参", "井", "张", "轸"]
  return goodYb.includes(yb) && goodMan.includes(man)
}

function getTraditionalYiJi(date: Date) {
  const sb = getStemBranchDay(date)
  const yb = getYellowBlackDay(date)
  const isAus = isAuspiciousDay(date)
  const yi: string[] = []
  const ji: string[] = []
  const stem = sb[0]
  if (["甲", "乙"].includes(stem)) {
    yi.push("祭祀", "祈福", "入学", "栽种")
    ji.push("动土", "开市", "破屋")
  } else if (["丙", "丁"].includes(stem)) {
    yi.push("嫁娶", "开市", "出行")
    ji.push("祭祀", "动土", "安葬")
  } else if (["戊", "己"].includes(stem)) {
    yi.push("修造", "动土", "入宅")
    ji.push("开市", "嫁娶", "出行")
  } else if (["庚", "辛"].includes(stem)) {
    yi.push("求医", "诉讼", "交易")
    ji.push("祈福", "祭祀", "安床")
  } else {
    yi.push("出行", "移徙", "纳财")
    ji.push("修造", "动土", "开仓")
  }
  const ybMap: Record<string, [string[], string[]]> = {
    建: [["祭祀", "祈福"], ["嫁娶", "开市"]],
    除: [["治病", "扫舍"], ["出行", "诉讼"]],
    满: [["祭祀", "开市"], ["嫁娶", "安葬"]],
    平: [["修造", "安床"], ["开市", "交易"]],
    定: [["嫁娶", "订盟"], ["词讼", "开渠"]],
    执: [["捕捉", "破土"], ["嫁娶", "移徙"]],
    破: [["破屋", "坏垣"], ["嫁娶", "开市"]],
    危: [["安床", "入宅"], ["破土", "开渠"]],
    成: [["嫁娶", "开市"], ["造桥", "安床"]],
    收: [["纳财", "交易"], ["开市", "安葬"]],
    开: [["开市", "交易"], ["破土", "安葬"]],
    闭: [["筑堤", "补垣"], ["开市", "出行"]],
  }
  if (ybMap[yb]) {
    yi.push(...ybMap[yb][0])
    ji.push(...ybMap[yb][1])
  }
  if (isAus) yi.push("嫁娶", "开市", "入宅")
  else ji.push("嫁娶", "开市", "出行")
  return { yi: [...new Set(yi)].slice(0, 6), ji: [...new Set(ji)].slice(0, 6) }
}

function getYiJiSimple(date: Date, type: number) {
  const t = getTraditionalYiJi(date)
  return type === 0 ? t.yi : t.ji
}

function BackgroundLayer({ family }: { family: string }) {
  const backgroundPath = getBackgroundPath(family)
  if (!colorMode && backgroundPath) {
    return (
      <Image
        filePath={backgroundPath}
        resizable
        scaleToFill
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      />
    )
  }
  return (
    <ZStack
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      background={bgColorStr}
    />
  )
}

function SectionText(props: { text: string; font?: number; color?: string; lineLimit?: number; opacity?: number }) {
  return (
    <Text
      styledText={{
        content: props.text,
        font: props.font,
        foregroundColor: props.color as any,
      }}
      lineLimit={props.lineLimit}
      opacity={props.opacity}
    />
  )
}

function CalendarHeaderText({ text, width }: { text: string; width: number }) {
  return (
    <Text
      styledText={{ content: text, font: s(10, "calendar"), foregroundColor: c("rgba(255,255,255,0.82)", "calendar") as any }}
      frame={{ width, height: 14 }}
      lineLimit={1}
    />
  )
}

function ForecastView({ future }: { future: WeatherFuture[] }) {
  return (
    <HStack spacing={7}>
      {future.slice(0, 3).map((item) => (
        <VStack spacing={1} frame={{ minWidth: 30 }}>
          <SectionText text={item.week || "-"} font={s(10, "poetry")} color={c("rgba(255,255,255,0.75)", "weather")} />
          <Image systemName={item.ico} frame={{ width: 14, height: 14 }} />
          <SectionText text={`${item.min}/${item.max}°`} font={s(9, "poetry")} color={c("rgba(255,255,255,0.8)", "weather")} />
        </VStack>
      ))}
    </HStack>
  )
}

function PoetryCard({ poetry, widgetType }: { poetry: PoetryInfo; widgetType: "medium" | "large" }) {
  const content = String(poetry.data?.content || "").replace(/[。，！]$/, "")
  const author = poetry.data?.origin ? `${poetry.data.origin.dynasty}·${poetry.data.origin.author}` : ""
  return (
    <VStack
      spacing={2}
      frame={{ width: widgetType === "medium" ? 82 : 92, alignment: "leading" }}
      padding={{ horizontal: 4, vertical: 3 }}
      background="rgba(102,102,102,0.26)"
    >
      <SectionText text={content} font={s(10, "poetry")} color={c("rgba(255,255,255,0.9)", "poetry")} lineLimit={3} />
      <SectionText text={`— ${author}`} font={s(8, "poetry")} color={c("rgba(255,255,255,0.6)", "poetry")} lineLimit={1} />
    </VStack>
  )
}

function getPrimaryCountdownText(date: Date) {
  const todayTerm = getSolarTerm(date)
  const nextTermInfo = getNextSolarTermInfo(date)
  if (todayTerm && nextTermInfo) return `今日${todayTerm} · 距离${nextTermInfo.term}还有${nextTermInfo.daysLeft}天`
  if (todayTerm) return `今日节气：${todayTerm}`
  if (nextTermInfo) return `距离${nextTermInfo.term}还有${nextTermInfo.daysLeft}天`
  return ""
}

function getSecondaryCountdownText(date: Date) {
  const nextFestivalInfo = getNextFestivalInfo(date)
  if (!nextFestivalInfo) return ""
  return nextFestivalInfo.daysLeft === 0 ? `${nextFestivalInfo.name}` : `距离${nextFestivalInfo.name}还有${nextFestivalInfo.daysLeft}天`
}

function DashedDivider({ widgetType }: { widgetType: "medium" | "large" }) {
  const dashCount = widgetType === "medium" ? 22 : 26
  return (
    <HStack spacing={2} padding={{ top: 1, bottom: 1 }}>
      {Array.from({ length: dashCount }).map((_, index) => (
        <Rectangle
          key={index}
          fill={{ color: "#ffffff" as any, opacity: 0.34 }}
          frame={{ width: 3, height: 1 }}
        />
      ))}
    </HStack>
  )
}

function CompactCountdownRow({ icon, text, accent, widgetType }: { icon: string; text: string; accent: string; widgetType: "medium" | "large" }) {
  return (
    <HStack spacing={3} frame={{ maxWidth: widgetType === "medium" ? 142 : 162, alignment: "leading" }}>
      <SectionText
        text={icon}
        font={s(widgetType === "medium" ? 8 : 9, "timeInfo")}
        color={accent}
        lineLimit={1}
      />
      <SectionText
        text={text}
        font={s(widgetType === "medium" ? 8 : 9, "timeInfo")}
        color={c("rgba(255,255,255,0.78)", "timeInfo")}
        lineLimit={1}
      />
    </HStack>
  )
}

function BottomCountdownBlock({ primary, secondary, widgetType }: { primary: string; secondary: string; widgetType: "medium" | "large" }) {
  if (!primary && !secondary) return null
  return (
    <VStack alignment="leading" spacing={1} padding={{ top: widgetType === "medium" ? 1 : 2 }}>
      <DashedDivider widgetType={widgetType} />
      {primary ? (
        <CompactCountdownRow icon="▣" text={primary} accent="#ffd166" widgetType={widgetType} />
      ) : null}
      {secondary ? (
        <CompactCountdownRow icon="♥" text={secondary} accent="#ff8fab" widgetType={widgetType} />
      ) : null}
    </VStack>
  )
}

function getNextMidnightDate(now: Date) {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight
}

function getNextWidgetReloadDate(now: Date, refreshMinutes: number, forceReload = false) {
  if (forceReload) return new Date(now.getTime() + 60 * 1000)
  const intervalDate = new Date(now.getTime() + refreshMinutes * 60 * 1000)
  const midnightDate = getNextMidnightDate(now)
  const inMidnightWindow = now.getHours() === 23 && now.getMinutes() >= 55
  const justAfterMidnight = now.getHours() === 0 && now.getMinutes() <= 5
  const midnightWindowDate = new Date(now.getTime() + (justAfterMidnight ? 2 : 1) * 60 * 1000)
  if (inMidnightWindow || justAfterMidnight) return midnightWindowDate
  return intervalDate.getTime() < midnightDate.getTime() ? intervalDate : midnightDate
}

function formatUpdateTime(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return "--:--"
  const date = new Date(timestamp)
  return `${date.getHours()}:${pad(date.getMinutes())}`
}

function getNoRainFriendlyText(now: Date) {
  const h = now.getHours()
  if (h < 5 || h >= 23) return "未来两小时不会有雨，夜深了早点休息～"
  if (h < 11) return "未来两小时不会有雨，早上出门放心哦～"
  if (h < 13) return "未来两小时不会有雨，中午安心出行哦～"
  if (h < 18) return "未来两小时不会有雨，下午出门放心哦～"
  return "未来两小时不会有雨，晚上出门放心哦～"
}

function shortenWeatherDesc(text: string, widgetType: "medium" | "large") {
  const normalized = String(text || "").replace(/\s+/g, " ").trim()
  if (!normalized) return "..."
  const friendlyNoRainText = getNoRainFriendlyText(new Date())
  if (/未来两小时不会有雨|未来两小时不会下雨|2小时内无雨|两小时内无雨/u.test(normalized)) return friendlyNoRainText
  const restored = normalized
    .replace(/^2小时内/u, "未来两小时")
    .replace(/^两小时内/u, "未来两小时")
    .replace(/不会下雨/u, "不会有雨")
    .replace(/无雨/u, "不会有雨")
  if (widgetType === "large") return restored
  return restored
    .replace(/还在加班么？/u, "")
    .replace(/您/u, "")
    .replace(/呢\?*/u, "")
    .replace(/[，！？]$/u, "")
    .trim() || restored
}

function InfoSide({ weatherInfo, lunarStr, poetry, schedules, widgetType }: { weatherInfo: WeatherInfo; lunarStr: string; poetry: PoetryInfo | null; schedules: ScheduleInfo[]; widgetType: "medium" | "large" }) {
  const currentDate = new Date()
  const cityStr = getDisplayLocationText()
  const wDesc = shortenWeatherDesc(weatherInfo.alertWeatherTitle || weatherInfo.weatherDesc || "...", widgetType)
  const primaryCountdownText = getPrimaryCountdownText(currentDate)
  const secondaryCountdownText = getSecondaryCountdownText(currentDate)
  const leftWidth = widgetType === "medium" ? 202 : 210

  appendDebugLog("widget info summary", {
    cityStr,
    primaryCountdownText,
    secondaryCountdownText,
  })

  return (
    <VStack alignment="leading" spacing={widgetType === "medium" ? 1 : 2} frame={{ width: leftWidth, alignment: "leading" }} {...offsetStyle(widgetType, "left")}>
      <SectionText text={provideGreeting(currentDate)} font={s(widgetType === "medium" ? 21 : 22, "greeting")} color={c("#ffffff", "greeting")} lineLimit={1} />
      <HStack spacing={3} frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 1 }}>
        <SectionText text={getDateStr(currentDate)} font={s(widgetType === "medium" ? 15 : 15, "date")} color={c("#ffcc99", "date")} lineLimit={1} />
        <SectionText text={lunarStr || ""} font={s(widgetType === "medium" ? 14 : 13, "lunar")} color={c("#99ccff", "lunar")} lineLimit={1} />
      </HStack>
      <HStack spacing={4} alignment="center" frame={{ width: leftWidth, height: widgetType === "medium" ? 17 : 18, alignment: "leading" }} padding={{ top: 0, bottom: 0 }}>
        <SectionText text={weekTitle[currentDate.getDay()]} font={s(widgetType === "medium" ? 12 : 13, "info")} color={c("rgba(255,255,255,0.9)", "info")} lineLimit={1} />
        <SectionText text="📍" font={s(widgetType === "medium" ? 10 : 11, "info")} color="#ff6b6b" lineLimit={1} />
        <SectionText text={cityStr} font={s(widgetType === "medium" ? 9 : 10, "info")} color={c("rgba(255,255,255,0.92)", "info")} lineLimit={1} />
      </HStack>
      <VStack alignment="leading" spacing={0} frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 1 }}>
        <SectionText text={wDesc} font={s(widgetType === "medium" ? 9 : 11, "weather")} color={c("#ffffff", "weather")} lineLimit={widgetType === "medium" ? 2 : 3} />
      </VStack>
      <Spacer minLength={widgetType === "medium" ? 1 : 3} />
      <HStack alignment="top" spacing={widgetType === "medium" ? 6 : 8} frame={{ width: leftWidth, alignment: "leading" }}>
        {weatherInfo.future && weatherInfo.future.length > 0 ? <ForecastView future={weatherInfo.future} /> : <Spacer />}
        {poetry?.data ? <PoetryCard poetry={poetry} widgetType={widgetType} /> : null}
      </HStack>
      <BottomCountdownBlock primary={primaryCountdownText} secondary={secondaryCountdownText} widgetType={widgetType} />
    </VStack>
  )
}

function getWeatherIconColor(icon: string) {
  if (icon.includes("sun") || icon.includes("sunrise") || icon.includes("sunset")) return "#ffd166"
  if (icon.includes("cloud.sun")) return "#ffc857"
  if (icon.includes("cloud")) return "#9bd7ff"
  if (icon.includes("rain") || icon.includes("drop")) return "#70c8ff"
  if (icon.includes("snow")) return "#d7f3ff"
  if (icon.includes("wind")) return "#b8f7d4"
  if (icon.includes("bolt")) return "#ffe066"
  return "#ffd166"
}

function WeatherMetricLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <HStack spacing={3} frame={{ maxWidth: "infinity", alignment: "trailing" }}>
      <SectionText text={label} font={s(9, "weather")} color={c("rgba(255,255,255,0.58)", "weather")} lineLimit={1} />
      <SectionText text={value || "--"} font={s(10, "weather")} color={color || c("rgba(255,255,255,0.95)", "weather")} lineLimit={1} />
    </HStack>
  )
}

function WeatherSide({ weatherInfo, widgetType }: { weatherInfo: WeatherInfo; widgetType: "medium" | "large" }) {
  const wIco = weatherInfo.weatherIco || "sun.max.fill"
  const wTemp = weatherInfo.bodyFeelingTemperature !== undefined ? weatherInfo.bodyFeelingTemperature : "-"
  const lineColor = c("#ffffff", "weather")
  const iconSize = widgetType === "medium" ? 27 : 30
  const temperatureFont = s(widgetType === "medium" ? 18 : 20, "weatherLarge")
  const updateFont = s(widgetType === "medium" ? 8 : 9, "weather")
  const updateText = `更新 ${formatUpdateTime(weatherInfo.updatedAt)}`
  return (
    <VStack alignment="trailing" spacing={widgetType === "medium" ? 3 : 4} frame={{ maxHeight: "infinity", alignment: "center" }} {...offsetStyle(widgetType, "right")}>
      <HStack spacing={5} padding={{ bottom: widgetType === "medium" ? 1 : 2 }}>
        <Image
          systemName={wIco}
          renderingMode="template"
          foregroundStyle={getWeatherIconColor(wIco) as any}
          frame={{ width: iconSize, height: iconSize }}
        />
        <Text font={temperatureFont}>{`${wTemp}°C`}</Text>
      </HStack>

      <VStack alignment="trailing" spacing={widgetType === "medium" ? 1 : 2}>
        <WeatherMetricLine label="湿度" value={weatherInfo.humidity || "--"} />
        <WeatherMetricLine label="体感" value={weatherInfo.comfort || "--"} />
        <WeatherMetricLine label="紫外线" value={weatherInfo.ultraviolet || "--"} />
        <WeatherMetricLine label="空气" value={weatherInfo.aqiInfo || "--"} />
      </VStack>

      <VStack alignment="trailing" spacing={widgetType === "medium" ? 2 : 3} padding={{ top: widgetType === "medium" ? 2 : 4 }}>
        <HStack spacing={7} padding={{ top: 1, bottom: 1 }}>
          <SectionText text={`↑${weatherInfo.maxTemperature ?? "-"}°`} font={s(10, "weather")} color={c("#ff6b6b", "weather")} />
          <SectionText text={`↓${weatherInfo.minTemperature ?? "-"}°`} font={s(10, "weather")} color={c("#72e38a", "weather")} />
        </HStack>
        <HStack spacing={widgetType === "medium" ? 8 : 11}>
          <HStack spacing={2}>
            <Image systemName="sunrise.fill" renderingMode="template" foregroundStyle={"#ffcc66" as any} frame={{ width: 10, height: 10 }} />
            <SectionText text={weatherInfo.sunrise || "--:--"} font={s(9, "weather")} color={lineColor} />
          </HStack>
          <HStack spacing={2}>
            <Image systemName="sunset.fill" renderingMode="template" foregroundStyle={"#ff8a5c" as any} frame={{ width: 10, height: 10 }} />
            <SectionText text={weatherInfo.sunset || "--:--"} font={s(9, "weather")} color={lineColor} />
          </HStack>
        </HStack>
        <SectionText text={updateText} font={updateFont} color={c("rgba(255,255,255,0.58)", "weather")} lineLimit={1} />
      </VStack>
    </VStack>
  )
}

function YiJiBlock({ title, circleColor, list, textColor }: { title: string; circleColor: string; list: string[]; textColor: string }) {
  return (
    <HStack spacing={5} alignment="center">
      <ZStack frame={{ width: 24, height: 24 }}>
        <Circle fill={{ color: circleColor as any, opacity: 0.96 }} />
        <SectionText text={title} font={s(13, "timeInfo")} color="#ffffff" lineLimit={1} />
      </ZStack>
      <VStack alignment="leading" spacing={1}>
        <SectionText text={list.slice(0, 3).join("  ")} font={s(8, "timeInfo")} color={c(textColor, "timeInfo")} lineLimit={1} />
        {list.length > 3 ? <SectionText text={list.slice(3, 6).join("  ")} font={s(8, "timeInfo")} color={c(textColor, "timeInfo")} lineLimit={1} /> : null}
      </VStack>
    </HStack>
  )
}

function TimeInfoBar() {
  const currentDate = new Date()
  const lunarObj = getLunarDate_Precise(currentDate)
  const zodiac = zodiacAnimals[(currentDate.getFullYear() - 4) % 12]
  const weekNumber = getWeekOfYear(currentDate)
  const dayOfYear = getDayOfYear(currentDate)
  const totalDays = currentDate.getFullYear() % 4 === 0 ? 366 : 365
  const yiList = getYiJiSimple(currentDate, 0)
  const jiList = getYiJiSimple(currentDate, 1)
  return (
    <HStack spacing={4} padding={{ horizontal: 0 }} alignment="center">
      <VStack alignment="leading" spacing={1} frame={{ minWidth: 86, alignment: "leading" }}>
        <SectionText text={`${zodiac}年 ${lunarObj.month}${lunarObj.day}`} font={s(11, "timeInfo")} color={c("#99ccff", "timeInfo")} lineLimit={1} />
        <SectionText text={`第${weekNumber}周 · 第${dayOfYear}天`} font={s(9, "timeInfo")} color={c("#ffcc99", "timeInfo")} lineLimit={1} />
      </VStack>
      <Spacer minLength={4} />
      <YiJiBlock title="宜" circleColor="#D32F2F" list={yiList} textColor="#ff7777" />
      <Spacer minLength={4} />
      <YiJiBlock title="忌" circleColor="#333333" list={jiList} textColor="#ffffff" />
    </HStack>
  )
}

function CalendarView() {
  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthGrid = getMonthGrid(year, month)
  return (
    <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
      <HStack spacing={0} frame={{ maxWidth: "infinity" }}>
        {weekTitleShort.map((day, idx) => (
          <VStack frame={{ maxWidth: "infinity" }} alignment="center">
            <Text
              styledText={{ content: day, font: s(12, "calendar"), foregroundColor: (idx === 0 || idx === 6 ? c("#ff6666", "calendar") : c("rgba(255,255,255,0.82)", "calendar")) as any }}
              lineLimit={1}
            />
          </VStack>
        ))}
      </HStack>
      {monthGrid.map((week) => (
        <HStack spacing={0} frame={{ maxWidth: "infinity" }}>
          {week.map((dayData, dayIndex) => {
            const isWeekend = dayIndex === 0 || dayIndex === 6
            const dayColor = isWeekend ? c("#ff6666", "calendar") : c("#ffffff", "calendar")
            
            if (dayData === null) {
              return (
                <VStack spacing={0} frame={{ maxWidth: "infinity" }} alignment="center">
                  <SectionText text=" " font={s(12, "calendar")} lineLimit={1} />
                </VStack>
              )
            }

            const dateObj = new Date(year, month, dayData)
            const isToday = dateObj.getDate() === currentDate.getDate() && dateObj.getMonth() === currentDate.getMonth()
            const lunar = getLunarDate_Precise(dateObj)
            const lunarStr = getSolarTerm(dateObj) || lunar.day

            return (
              <VStack spacing={0} frame={{ maxWidth: "infinity" }} alignment="center">
                {isToday ? (
                  <ZStack frame={{ width: s(18, "calendar"), height: s(18, "calendar") }}>
                    <Circle fill={{ color: "#ffcc00", opacity: 1 }} />
                    <SectionText text={String(dayData)} font={s(12, "calendar")} color={c("#000000", "calendar")} lineLimit={1} />
                  </ZStack>
                ) : (
                  <SectionText text={String(dayData)} font={s(12, "calendar")} color={dayColor} lineLimit={1} />
                )}
                <SectionText text={lunarStr} font={s(7, "calendar")} color={c("rgba(255,255,255,0.6)", "calendar")} lineLimit={1} />
              </VStack>
            )
          })}
        </HStack>
      ))}
    </VStack>
  )
}

function MediumWidgetView(props: { weatherInfo: WeatherInfo; lunarStr: string; poetry: PoetryInfo | null; schedules: ScheduleInfo[] }) {
  return (
    <HStack alignment="center" spacing={5} padding={{ top: 5, leading: 8, trailing: 10, bottom: 6 }}>
      <VStack frame={{ width: 202, alignment: "leading" }}>
        <InfoSide weatherInfo={props.weatherInfo} lunarStr={props.lunarStr} poetry={props.poetry} schedules={props.schedules} widgetType="medium" />
      </VStack>
      <Spacer />
      <VStack frame={{ width: 100, maxHeight: "infinity", alignment: "center" }}>
        <WeatherSide weatherInfo={props.weatherInfo} widgetType="medium" />
      </VStack>
    </HStack>
  )
}

function LargeWidgetView(props: { weatherInfo: WeatherInfo; lunarStr: string; poetry: PoetryInfo | null; schedules: ScheduleInfo[] }) {
  return (
    <VStack alignment="leading" spacing={1} padding={{ top: 13, bottom: 3 }}>
      <VStack padding={{ leading: 12, trailing: 12 }}>
        <HStack alignment="top" spacing={6} frame={{ minHeight: 120 }}>
          <InfoSide weatherInfo={props.weatherInfo} lunarStr={props.lunarStr} poetry={props.poetry} schedules={props.schedules} widgetType="large" />
          <Spacer minLength={2} />
          <WeatherSide weatherInfo={props.weatherInfo} widgetType="large" />
        </HStack>
        <VStack frame={{ height: 4 }} />
        <TimeInfoBar />
      </VStack>
      <VStack frame={{ height: 2 }} />
      <VStack padding={{ leading: 4, trailing: 4 }}>
        <CalendarView />
      </VStack>
    </VStack>
  )
}

function ErrorWidgetView({ message }: { message: string }) {
  return (
    <VStack alignment="leading" spacing={6} padding={12} background="#3b0d0d">
      <Text font="headline">⚠️ 组件运行出错</Text>
      <Text font="caption" lineLimit={4}>{message}</Text>
    </VStack>
  )
}

function WidgetRoot(props: { weatherInfo: WeatherInfo; lunarStr: string; poetry: PoetryInfo | null; schedules: ScheduleInfo[] }) {
  const family = Widget.family
  return (
    <ZStack alignment="topLeading" widgetURL={Script.createOpenURLScheme(scriptName)}>
      <BackgroundLayer family={family} />
      {family === "systemLarge" ? (
        <LargeWidgetView {...props} />
      ) : (
        <MediumWidgetView {...props} />
      )}
    </ZStack>
  )
}

async function main() {
  await ensureBackgroundMigrated()
  appendDebugLog("widget render start", {
    styleConfig,
    lockLocation,
    savedLocation: locationData,
    apiKeyExists: Boolean(apiKey),
  })
  const refreshMinutesRaw = parseInt(String(styleConfig.refreshInterval || 60), 10)
  const refreshMinutes = Number.isNaN(refreshMinutesRaw) ? 60 : Math.max(5, refreshMinutesRaw)
  const now = new Date()
  const forceRefreshRequested = hasRecentForceReloadRequest(now.getTime())
  const reloadDate = getNextWidgetReloadDate(now, refreshMinutes, forceRefreshRequested)
  const [weatherInfo, poetry, schedules] = await Promise.all([
    safeGetWeather(forceRefreshRequested),
    safeGetPoetry(),
    safeGetSchedules(),
  ])
  const lunarStr = safeGetLunarStr()
  appendDebugLog("widget render payload", {
    weatherInfo,
    lunarStr,
    scheduleCount: schedules.length,
    forceRefreshRequested,
    reloadDate: reloadDate.toISOString(),
  })
  Widget.present(
    <WidgetRoot weatherInfo={weatherInfo} lunarStr={lunarStr} poetry={poetry} schedules={schedules} />,
    { policy: "after", date: reloadDate } as any,
  )
}

main().catch((error) => {
  Widget.present(<ErrorWidgetView message={String(error?.message || error)} />)
})
