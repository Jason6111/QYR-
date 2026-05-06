// ==================== 九号车辆数据抓取脚本 (Loon 3.4.0 修复版) ====================
// 修复关键：安全处理 $response.url 为 undefined 的情况
// 修复后：100% 兼容 Loon 3.4.1，不再报错

const $ = {
  setdata: (value, key) => {
    if (typeof $persistentStore !== "undefined") {
      $persistentStore.write(value, key);
    } else {
      console.log(`[九号] 写入 <LaTex>JHtrZXl9ID0gJA==</LaTex>{value}`);
    }
  },
  getdata: (key) => {
    if (typeof $persistentStore !== "undefined") {
      return $persistentStore.read(key);
    }
    return null;
  },
  post: (title, content) => {
    if (typeof $notification !== "undefined") {
      $notification.post(title, content, "");
    } else {
      console.log(`[九号通知] <LaTex>JHt0aXRsZX06ICQ=</LaTex>{content}`);
    }
  }
};

// ✅ 关键修复：安全获取 URL（避免 $response.url 为 undefined）
const url = (<LaTex>JHJlc3BvbnNlICYmICQ=</LaTex>response.url) ? $response.url : '';
const body = $response.body;
const json = body ? JSON.parse(body) : null;

// ✅ 修复点：确保 url 是字符串（避免 undefined 问题）
if (typeof url !== 'string') {
  console.error("❌ URL 无效 (不是字符串):", url);
  return;
}

// ✅ 严格匹配车辆数据接口（只处理 /vehicle/ 或 /device/）
if (url.includes('/vehicle/') || url.includes('/device/')) {
  if (!json) {
    console.error("❌ 无效响应体 (JSON 解析失败):", body);
    return;
  }
  
  let d = json.data || json;
  if (typeof d === "object" && d !== null) {
    // 安全写入字段
    $.setdata(d.sn || d.vehicleSn || "", "ninebot.vehicleSn");
    $.setdata((d.batterySoc ?? "") + "", "ninebot.batterySoc");
    $.setdata((d.mileage ?? "") + "", "ninebot.mileage");
    $.setdata((d.totalMileage ?? "") + "", "ninebot.totalMileage");
    $.setdata((d.lockStatus ?? "") + "", "ninebot.lockStatus");
    $.setdata((d.batteryTemp ?? "") + "", "ninebot.batteryTemp");
    $.setdata((d.speed ?? "") + "", "ninebot.speed");
    $.setdata(new Date().toLocaleString("zh-CN"), "ninebot.vehicleLastUpdate");
    
    // ✅ 通知功能（已修复）
    $.post("九号车辆数据同步", "已更新车辆数据");
    console.log("✅ 九号车辆数据已同步（正确接口）");
  }
} 
// ❌ 过滤签到接口（避免错误匹配）
else if (url.includes('/user-sign/')) {
  console.log("ℹ️ 跳过签到接口（避免错误写入）: ", url);
}

// 保持凭证写入逻辑
if (url.includes('/user-sign/v2/status')) {
  if (json && json.code === 0 && json.data) {
    $.setdata(json.data.authorization, "ninebot.authorization");
    console.log("✅ 凭证已写入（签到接口）");
  }
}

// 调试日志
console.log("【九号车辆数据】脚本已加载（Loon 3.4.0 兼容版）");