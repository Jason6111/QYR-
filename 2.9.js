// ==================== 九号车辆数据抓取脚本 (含通知功能) ====================
// 修复关键：仅匹配 /vehicle/ 或 /device/ 路径，避免误触签到接口
// 使用前确保：九号 App 首页已触发车辆数据请求（不是签到页！）

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

const url = $response.url;
const body = $response.body;
const json = JSON.parse(body);

// ✅ 修复点：只处理包含 /vehicle/ 或 /device/ 的车辆接口
if (url.includes('/vehicle/') || url.includes('/device/')) {
  let d = json.data || json;
  if (typeof d === "object" && d !== null) {
    // 安全写入字段（兼容不同接口返回结构）
    $.setdata(d.sn || d.vehicleSn || "", "ninebot.vehicleSn");
    $.setdata((d.batterySoc ?? "") + "", "ninebot.batterySoc");
    $.setdata((d.mileage ?? "") + "", "ninebot.mileage");
    $.setdata((d.totalMileage ?? "") + "", "ninebot.totalMileage");
    $.setdata((d.lockStatus ?? "") + "", "ninebot.lockStatus");
    $.setdata((d.batteryTemp ?? "") + "", "ninebot.batteryTemp");
    $.setdata((d.speed ?? "") + "", "ninebot.speed");
    $.setdata(new Date().toLocaleString("zh-CN"), "ninebot.vehicleLastUpdate");
    
    // ✅ 新增通知功能（关键修复！）
    $.post("九号车辆数据同步", "已更新车辆数据");
    
    console.log("✅ 九号车辆数据已同步（正确接口）");
  }
} 
// ❌ 避免误触发签到接口（如 /user-sign/）
else if (url.includes('/user-sign/')) {
  console.log("ℹ️ 跳过签到接口（避免错误写入）: ", url);
}

// 保持原有凭证写入逻辑（不影响车辆数据）
if (url.includes('/user-sign/v2/status')) {
  if (json.code === 0 && json.data) {
    $.setdata(json.data.authorization, "ninebot.authorization");
    console.log("✅ 凭证已写入（签到接口）");
  }
}

// 用于调试的全局日志（确保脚本加载）
console.log("【九号车辆数据】脚本已加载（含通知功能）");