/***********************************************
Ninebot_Sign_Single_v3.0.js
单账号稳定版 + 主动获取车辆数据
***********************************************/

const IS_REQUEST = typeof $request !== "undefined";
const HAS_PERSIST = typeof $persistentStore !== "undefined";
const HAS_NOTIFY = typeof $notification !== "undefined";

/* ===== 工具 ===== */
function readPS(key) {
  try { return HAS_PERSIST ? $persistentStore.read(key) : null; }
  catch { return null; }
}
function writePS(val, key) {
  try { return HAS_PERSIST ? $persistentStore.write(val, key) : false; }
  catch { return false; }
}
function notify(t, s, b) {
  if (HAS_NOTIFY) $notification.post(t, s, b);
}
function safe(v) {
  return (v === undefined || v === null) ? "" : String(v);
}

/* ===== 配置 ===== */
const cfg = {
  Authorization: readPS("ninebot.authorization"),
  DeviceId: readPS("ninebot.deviceId"),
  UA: readPS("ninebot.userAgent") || "Ninebot/3620 CFNetwork Darwin",
  notify: readPS("ninebot.notify") !== "false"
};

if (!cfg.Authorization || !cfg.DeviceId) {
  notify("九号", "未配置", "请先抓包");
  $done();
}

/* ===== 请求封装 ===== */
function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    $httpClient.get({ url, headers }, (err, resp, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    $httpClient.post({ url, headers, body: JSON.stringify(body) }, (err, resp, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

function headers() {
  return {
    "Authorization": cfg.Authorization,
    "device_id": cfg.DeviceId,
    "User-Agent": cfg.UA,
    "Content-Type": "application/json"
  };
}

/* ===== ✅ 核心：车辆数据主动获取 ===== */
async function fetchVehicleData() {
  const API_LIST = [
    "https://api-ninebot.9fevs.com/api/vehicle/v1/device/realTimeData",
    "https://api-jhcx-v6-bj.ninebot.com/vehicle/v1/device/status"
  ];

  let data = null;

  for (const url of API_LIST) {
    try {
      const resp = await httpGet(url, headers());
      const d = resp?.data || resp?.result;

      if (d && (d.batterySoc !== undefined || d.sn)) {
        data = d;
        break;
      }
    } catch {}
  }

  if (!data) return;

  writePS(safe(data.sn || data.vehicleSn), "ninebot.vehicleSn");
  writePS(safe(data.batterySoc), "ninebot.batterySoc");
  writePS(safe(data.mileage), "ninebot.mileage");
  writePS(safe(data.totalMileage), "ninebot.totalMileage");
  writePS(safe(data.lockStatus), "ninebot.lockStatus");
  writePS(safe(data.batteryTemp), "ninebot.batteryTemp");
  writePS(safe(data.speed), "ninebot.speed");

  writePS(new Date().toISOString(), "ninebot.vehicleLastUpdate");
}

/* ===== rewrite 抓包（兜底） ===== */
if (IS_REQUEST && $response && $response.body) {
  const enable = readPS("ninebot.captureEnable");
  if (enable === "true") {
    try {
      const json = JSON.parse($response.body);
      const d = json.data || json.result || json;

      if (d) {
        writePS(safe(d.sn || d.vehicleSn), "ninebot.vehicleSn");
        writePS(safe(d.batterySoc), "ninebot.batterySoc");
        writePS(safe(d.mileage), "ninebot.mileage");
        writePS(safe(d.totalMileage), "ninebot.totalMileage");
        writePS(safe(d.lockStatus), "ninebot.lockStatus");
        writePS(safe(d.batteryTemp), "ninebot.batteryTemp");
        writePS(safe(d.speed), "ninebot.speed");

        writePS(new Date().toISOString(), "ninebot.vehicleLastUpdate");
      }
    } catch {}
  }
  $done({});
  return;
}

/* ===== 主流程 ===== */
(async () => {

  // ✅ 先拉车辆数据（关键）
  await fetchVehicleData();

  // ===== 签到 =====
  let signMsg = "";

  try {
    const resp = await httpPost(
      "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign",
      headers(),
      { deviceId: cfg.DeviceId }
    );

    if (resp.code === 0) {
      signMsg = "签到成功";
    } else if ((resp.msg || "").includes("已签到")) {
      signMsg = "今日已签到";
    } else {
      signMsg = "签到失败";
    }

  } catch {
    signMsg = "签到异常";
  }

  /* ===== 通知 ===== */
  if (cfg.notify) {
    const battery = readPS("ninebot.batterySoc") || "--";
    const mileage = readPS("ninebot.mileage") || "--";
    const lock = readPS("ninebot.lockStatus") == "1" ? "已锁车" : "未锁车";

    notify(
      "九号助手",
      signMsg,
      `电量:${battery}% 续航:${mileage}km 状态:${lock}`
    );
  }

  $done();

})();