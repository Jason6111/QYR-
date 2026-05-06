// ==UserScript==
// @name         九号智能电动车 · 自动签到 + 车辆数据
// @namespace    https://t.me/JiuHaoAPP
// @version      2.9.0
// @author       QinyRui
// @description  支持自动抓包、签到、盲盒、车辆状态同步
// ==/UserScript==

!(async () => {
  const $ = new Env("九号签到助手");
  const isRequest = typeof $request !== "undefined";
  const isResponse = typeof $response !== "undefined";

  // ========== 响应处理：抓包写入 ==========
  if (isResponse) {
    const url = $request.url;
    const body = $response.body;

    if (!body) return $.done({});

    try {
      const json = JSON.parse(body);

      // 1. 签到接口 → 写入 Authorization / DeviceId
      if (url.includes("/user-sign/v2/status")) {
        const auth = $request.headers?.Authorization || "";
        const deviceId = $request.headers?.["X-Device-Id"] || "";
        const ua = $request.headers?.["User-Agent"] || "";

        if (auth && deviceId) {
          $.setdata(auth, "ninebot.authorization");
          $.setdata(deviceId, "ninebot.deviceId");
          $.setdata(ua, "ninebot.userAgent");
          $.setdata(new Date().toLocaleString("zh-CN"), "ninebot.lastCaptureAt");
          console.log("✅ 九号凭证已写入 BoxJS");
        }
      }

      // 2. 车辆数据接口 → 写入车辆状态（兼容多种结构）
      if (/(realTimeData|status)/.test(url)) {
        let d = json.data || json;
        if (typeof d === "object" && d !== null) {
          $.setdata(d.sn || d.vehicleSn || "", "ninebot.vehicleSn");
          $.setdata((d.batterySoc ?? "") + "", "ninebot.batterySoc");
          $.setdata((d.mileage ?? "") + "", "ninebot.mileage");
          $.setdata((d.totalMileage ?? "") + "", "ninebot.totalMileage");
          $.setdata((d.lockStatus ?? "") + "", "ninebot.lockStatus");
          $.setdata((d.batteryTemp ?? "") + "", "ninebot.batteryTemp");
          $.setdata((d.speed ?? "") + "", "ninebot.speed");
          $.setdata(new Date().toLocaleString("zh-CN"), "ninebot.vehicleLastUpdate");
          console.log("✅ 九号车辆数据已同步");
        }
      }
    } catch (e) {
      console.log("❌ 解析响应失败:", e.message);
    }

    return $.done({});
  }

  // ========== 定时任务：自动签到 + 盲盒 ==========
  const notify = $.getdata("ninebot.notify") !== "false";
  const notifyFail = $.getdata("ninebot.notifyFail") !== "false";
  const autoOpenBox = $.getdata("ninebot.autoOpenBox") === "true";
  const autoRepair = $.getdata("ninebot.autoRepair") === "true";
  const titlePrefix = $.getdata("ninebot.titlePrefix") || "九号签到助手";
  const logLevel = $.getdata("ninebot.logLevel") || "simple";

  const auth = $.getdata("ninebot.authorization");
  const deviceId = $.getdata("ninebot.deviceId");
  const ua = $.getdata("ninebot.userAgent") || "Ninebot/3620 CFNetwork/3860.200.71 Darwin/25.1.0";

  if (!auth || !deviceId) {
    const msg = "❌ 凭证缺失，请先打开九号 App 签到页自动抓包！";
    log(msg);
    notify && $.msg(titlePrefix, "", msg);
    return $.done();
  }

  const headers = {
    Authorization: auth,
    "X-Device-Id": deviceId,
    "User-Agent": ua,
    "Content-Type": "application/json",
  };

  // 签到
  let signResult = await sign(headers);
  let messages = [signResult.msg];

  // 补签
  if (autoRepair && signResult.code !== 0) {
    const repairRes = await repairSign(headers);
    messages.push(repairRes.msg);
  }

  // 盲盒
  if (autoOpenBox) {
    const boxRes = await openAllBoxes(headers);
    messages.push(boxRes.msg);
  }

  const finalMsg = messages.join("\n");
  const isSuccess = messages.every(m => m.includes("成功") || m.includes("已签") || m.includes("无可"));
  if (isSuccess || notifyFail) {
    notify && $.msg(titlePrefix, "", finalMsg);
  }
  log(finalMsg);

  $.done();

  // --- 函数定义 ---
  async function sign(headers) {
    const url = "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign";
    try {
      const res = await $.post({ url, headers });
      const data = res.data;
      if (data.code === 0) return { code: 0, msg: "✅ 签到成功" };
      if (data.code === 1001) return { code: 1001, msg: "ℹ️ 今日已签到" };
      return { code: data.code, msg: `❌ 签到失败: ${data.msg}` };
    } catch (e) {
      return { code: -1, msg: `❌ 签到请求异常: ${e.message}` };
    }
  }

  async function repairSign(headers) {
    const url = "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/repair";
    try {
      const res = await $.post({ url, headers });
      const data = res.data;
      if (data.code === 0) return { code: 0, msg: "✅ 补签成功" };
      return { code: data.code, msg: `⚠️ 补签失败: ${data.msg}` };
    } catch (e) {
      return { code: -1, msg: `⚠️ 补签请求异常: ${e.message}` };
    }
  }

  async function openAllBoxes(headers) {
    const listUrl = "https://cn-cbu-gateway.ninebot.com/portal/api/box/list";
    const openUrl = "https://cn-cbu-gateway.ninebot.com/portal/api/box/open";
    try {
      const listRes = await $.get({ url: listUrl, headers });
      const boxes = listRes.data?.data?.filter(b => b.status === 1) || [];
      if (boxes.length === 0) return { msg: "📦 无可开启盲盒" };

      for (const box of boxes) {
        await $.post({ url: openUrl, headers, body: JSON.stringify({ boxId: box.id }) });
        await $.wait(1000);
      }
      return { msg: `🎁 已自动开启 ${boxes.length} 个盲盒` };
    } catch (e) {
      return { msg: `⚠️ 盲盒开启异常: ${e.message}` };
    }
  }

  function log(msg) {
    if (logLevel === "full" || (logLevel === "simple" && msg.includes("❌"))) {
      console.log(msg);
    }
  }
})()
  .catch(e => console.log("❌ 脚本异常:", e))
  .finally(() => {});

// ========================
// Env 类（适配 Surge/Loon/QX/Node）
function Env(name) {
  this.name = name;
  this.isSurge = typeof $httpClient !== "undefined";
  this.isQuanX = typeof $task !== "undefined";
  this.isLoon = typeof $loon !== "undefined";
  this.isNode = typeof require !== "undefined";
  this.getdata = key => {
    if (this.isSurge) return $persistentStore.read(key);
    if (this.isQuanX) return $prefs.valueForKey(key);
    if (this.isLoon) return $persistentStore.read(key);
    return null;
  };
  this.setdata = (val, key) => {
    if (this.isSurge) return $persistentStore.write(val, key);
    if (this.isQuanX) return $prefs.setValueForKey(val, key);
    if (this.isLoon) return $persistentStore.write(val, key);
  };
  this.msg = (title, subtitle, body) => {
    if (this.isSurge) $notification.post(title, subtitle, body);
    if (this.isQuanX) $notify(title, subtitle, body);
    if (this.isLoon) $notification.post(title, subtitle, body);
  };
  this.get = opts => {
    if (this.isSurge || this.isLoon) return $httpClient.get(opts);
    if (this.isQuanX) return new Promise((resolve, reject) => $task.fetch(opts).then(resolve, reject));
  };
  this.post = opts => {
    if (this.isSurge || this.isLoon) return $httpClient.post(opts);
    if (this.isQuanX) return new Promise((resolve, reject) => $task.fetch(opts).then(resolve, reject));
  };
  this.wait = ms => new Promise(r => setTimeout(r, ms));
  this.done = val => {
    if (this.isQuanX) $done(val);
    if (this.isSurge) $done(val);
    if (this.isLoon) $done(val);
  };
}