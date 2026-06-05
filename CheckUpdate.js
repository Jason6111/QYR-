// 九号电动车签到脚本更新检测｜Loon专用
// 匹配脚本：Ninebot_Sign_Single_v2.9.js
const SCRIPT_NAME = "Ninebot_Sign_Single_v2.9.js"
const REMOTE_SCRIPT_URL = "https://raw.githubusercontent.com/QinyRui/QYR-/jiuhao/Ninebot_Sign_Single_v2.9.js"
const UPDATE_NOTICE_TITLE = "【九号签到脚本】版本更新提醒"

// 正则匹配 // version: x.x.x
const VERSION_REG = /\/\/\s*version[:：]\s*([\d\.]+)/i

async function checkUpdate() {
    try {
        // 拉取远端源码
        const remote = await $httpClient.get({
            url: REMOTE_SCRIPT_URL,
            headers: {
                "User-Agent": "Mozilla/5.0 Loon Script CheckUpdate"
            }
        })
        if (remote.status !== 200) {
            console.log(`[更新检测] 远端拉取失败 code:${remote.status}`)
            $done()
            return
        }
        const remoteBody = remote.body
        const remoteVer = remoteBody.match(VERSION_REG)?.[1] ?? "0.0.0"
        const modifyTime = remote.headers["Last-Modified"] ?? "无"

        // 读取本地脚本
        let localVer = "0.0.0"
        try {
            const local = await $httpClient.get(`script://${SCRIPT_NAME}`)
            localVer = local.body.match(VERSION_REG)?.[1] ?? "0.0.0"
        } catch {
            console.log("[更新检测] 本地脚本不存在")
            localVer = "0.0.0"
        }

        const res = compareVer(remoteVer, localVer)
        let msg = ""
        if (res > 0) {
            msg = `✅发现新版本
本地：${localVer}
远端：${remoteVer}
更新时间：${modifyTime}
打开脚本链接替换即可`
            $notification.post(UPDATE_NOTICE_TITLE, "有新版本可用", msg)
        } else {
            msg = `已是最新版
本地:${localVer}｜远程:${remoteVer}`
        }
        console.log(msg)
    } catch (e) {
        console.log(`[更新检测异常]${e.message}`)
    }
    $done()
}

// 版本比较:1=需更新 /0=一致 /-1=本地更高
function compareVer(r, l) {
    const arrR = r.split(".").map(Number)
    const arrL = l.split(".").map(Number)
    const len = Math.max(arrR.length, arrL.length)
    for (let i = 0; i < len; i++) {
        const rv = arrR[i] || 0
        const lv = arrL[i] || 0
        if (rv > lv) return 1
        if (rv < lv) return -1
    }
    return 0
}

checkUpdate()