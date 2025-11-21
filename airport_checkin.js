/*
 * 机场自动签到 - 青龙面板专用
 * cron: 0 8 * * *
 * 环境变量: AIRPORT_TOKEN (必需)
 * 通知环境变量: TG_BOT_TOKEN, TG_USER_ID (可选)
 */

const axios = require('axios');

// =============== 配置区 ===============
const CONFIG = {
  name: '我的机场',
  url: 'https://7m9gi9norz.1095813.xyz',
  checkinPath: '/api/v1/user/trial/checkin',
  userInfoPath: '/api/v1/user/info',
  subscribePath: '/api/v1/user/getSubscribe',  // 订阅信息（包含流量）
};

// =============== 获取Token ===============
function getTokens() {
  const token = process.env.AIRPORT_TOKEN || '';
  if (!token) {
    console.log('❌ 错误：未配置 AIRPORT_TOKEN 环境变量');
    return [];
  }
  return token.split(/[&\n]/).map(t => t.trim()).filter(t => t);
}

// =============== 格式化流量 ===============
function formatTraffic(bytes) {
  // 处理无效值
  if (!bytes || bytes === 0 || isNaN(bytes)) {
    return '0 B';
  }
  
  // 确保是数字类型
  bytes = Number(bytes);
  
  // 处理负数
  if (bytes < 0) {
    return '0 B';
  }
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  
  // 防止 log 计算错误
  if (bytes < k) {
    return bytes.toFixed(2) + ' B';
  }
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // 确保索引在合理范围内
  const unitIndex = Math.min(i, units.length - 1);
  
  const value = bytes / Math.pow(k, unitIndex);
  
  return value.toFixed(2) + ' ' + units[unitIndex];
}

// =============== 获取流量信息（从订阅接口）===============
async function getSubscribeInfo(token) {
  try {
    const url = `${CONFIG.url}${CONFIG.subscribePath}`;
    console.log(`📡 获取订阅信息: ${url}`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000,
      validateStatus: () => true
    });

    if (response.status === 200 && response.data) {
      console.log('📦 订阅信息原始数据:', JSON.stringify(response.data, null, 2));
      
      const data = response.data.data || response.data;
      
      // 提取流量信息
      let transferUsed = 0;
      let transferTotal = 0;
      
      // V2Board 常见格式
      if (data.u !== undefined && data.d !== undefined) {
        transferUsed = Number(data.u || 0) + Number(data.d || 0);
        transferTotal = Number(data.transfer_enable || 0);
        console.log('✅ 从订阅信息获取到流量数据');
        console.log(`   u=${data.u}, d=${data.d}, transfer_enable=${data.transfer_enable}`);
      }
      
      return { 
        transferUsed: Number(transferUsed) || 0, 
        transferTotal: Number(transferTotal) || 0 
      };
    }
    
    return null;
  } catch (error) {
    console.log(`⚠️ 订阅信息获取失败:`, error.message);
    return null;
  }
}

// =============== 获取用户信息 ===============
async function getUserInfo(token) {
  try {
    // 1. 获取基本用户信息
    const url = `${CONFIG.url}${CONFIG.userInfoPath}`;
    console.log(`📡 获取用户信息: ${url}`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000,
      validateStatus: () => true
    });

    if (response.status === 200 && response.data) {
      const data = response.data.data || response.data;
      
      // 🔍 调试：打印完整数据
      console.log('📦 用户信息原始数据:', JSON.stringify(data, null, 2));
      
      let transferUsed = 0;
      let transferTotal = 0;
      
      // 尝试从用户信息接口获取流量
      if (data.u !== undefined && data.d !== undefined) {
        transferUsed = Number(data.u || 0) + Number(data.d || 0);
        transferTotal = Number(data.transfer_enable || 0);
        console.log('✅ 从用户信息获取到流量数据');
        console.log(`   原始值: u=${data.u}, d=${data.d}, transfer_enable=${data.transfer_enable}`);
        console.log(`   计算值: used=${transferUsed}, total=${transferTotal}`);
      } else {
        // 2. 如果用户信息没有流量，尝试订阅接口
        console.log('ℹ️ 用户信息中无流量数据，尝试订阅接口...');
        const subscribeInfo = await getSubscribeInfo(token);
        
        if (subscribeInfo) {
          transferUsed = Number(subscribeInfo.transferUsed || 0);
          transferTotal = Number(subscribeInfo.transferTotal || 0);
          console.log(`   订阅接口: used=${transferUsed}, total=${transferTotal}`);
        } else {
          console.log('⚠️ 无法获取流量使用数据');
        }
      }
      
      // 确保数据类型正确
      transferUsed = Number(transferUsed) || 0;
      transferTotal = Number(transferTotal) || 0;
      
      const userInfo = {
        email: data.email || '未知',
        transferUsed: transferUsed,
        transferTotal: transferTotal,
        expireTime: data.expired_at,
        planId: data.plan_id,
        deviceLimit: data.device_limit,
        uuid: data.uuid
      };
      
      console.log(`\n✅ 解析后的用户信息:`);
      console.log(`   📧 邮箱: ${userInfo.email}`);
      console.log(`   📊 已用(原始): ${userInfo.transferUsed} bytes`);
      console.log(`   📊 总量(原始): ${userInfo.transferTotal} bytes`);
      console.log(`   📊 已用(格式化): ${formatTraffic(userInfo.transferUsed)}`);
      console.log(`   📊 总量(格式化): ${formatTraffic(userInfo.transferTotal)}`);
      console.log(`   📱 设备限制: ${userInfo.deviceLimit || '无限'}`);
      
      return userInfo;
    } else {
      console.log(`⚠️ 用户信息获取失败: HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`⚠️ 获取用户信息异常:`, error.message);
    return null;
  }
}
// =============== 签到函数 ===============
async function checkin(token, index) {
  const name = `账号${index}`;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`【${name}】开始签到`);
  console.log(`${'='.repeat(50)}`);
  
  // 先获取用户信息
  const userInfo = await getUserInfo(token);
  
  try {
    const url = `${CONFIG.url}${CONFIG.checkinPath}`;
    console.log(`📍 请求地址: ${url}`);
    console.log(`🔑 Token前缀: ${token.substring(0, 30)}...`);
    
    const response = await axios({
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'Accept': '*/*',
        'Origin': CONFIG.url,
        'Referer': `${CONFIG.url}/index.php`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      data: {},
      timeout: 10000,
      validateStatus: () => true
    });

    console.log(`\n📊 响应状态: ${response.status}`);
    console.log(`📦 响应数据:`, response.data);

    let message = '';
    let success = false;
    let rewardTraffic = 0;

    if (response.status === 200) {
      success = true;
      const data = response.data;
      
      if (typeof data === 'object') {
        // 提取奖励流量
        if (data.data && data.data.bonus) {
          rewardTraffic = data.data.bonus;
        }
        
        const rawMsg = data.message || data.msg || '';
        
        if (data.data?.success === true) {
          console.log(`✅ 【${name}】签到成功！`);
          message = `签到成功${rewardTraffic ? `，获得 ${rewardTraffic}GB 流量` : ''}`;
        } else if (data.data?.success === false && data.data?.reason === 'already') {
          console.log(`ℹ️ 【${name}】今天已签到过`);
          message = '今日已签到';
        } else if (rawMsg && (rawMsg.includes('重复') || rawMsg.includes('已签到'))) {
          console.log(`ℹ️ 【${name}】今天已签到过`);
          message = '今日已签到';
        } else {
          console.log(`✅ 【${name}】签到完成`);
          message = rawMsg || '签到完成';
        }
      } else {
        message = String(data);
        console.log(`✅ 【${name}】签到成功`);
      }
    } else {
      console.log(`❌ 【${name}】签到失败`);
      message = `签到失败 (HTTP ${response.status})`;
    }

    console.log(`📝 签到信息: ${message}`);
    
    return { 
      success, 
      name, 
      message, 
      userInfo,
      rewardTraffic,
      data: response.data 
    };

  } catch (error) {
    console.log(`❌ 【${name}】签到异常`);
    
    let errorMsg = '';
    if (error.response) {
      errorMsg = `HTTP ${error.response.status}`;
      console.log(`📛 服务器返回:`, error.response.data);
    } else if (error.request) {
      errorMsg = '网络超时或无响应';
      console.log(`📛 网络错误`);
    } else {
      errorMsg = error.message;
      console.log(`📛 错误:`, error.message);
    }
    
    return { 
      success: false, 
      name, 
      message: errorMsg, 
      userInfo,
      error: errorMsg 
    };
  }
}

// =============== 发送通知 ===============
async function sendNotify(title, content) {
  // 尝试 sendNotify
  try {
    const paths = ['./sendNotify', '../sendNotify', '/ql/scripts/sendNotify'];
    for (const path of paths) {
      try {
        const notify = require(path);
        await notify.sendNotify(title, content);
        console.log('✅ 通知发送成功（sendNotify）');
        return true;
      } catch (e) {}
    }
  } catch (e) {}
  
  // Telegram
  const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const TG_USER_ID = process.env.TG_USER_ID || process.env.TELEGRAM_CHAT_ID;
  
  if (!TG_BOT_TOKEN || !TG_USER_ID) {
    console.log('ℹ️ 未配置通知');
    return false;
  }
  
  try {
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: TG_USER_ID,
      text: `${title}\n\n${content}`,
      parse_mode: 'HTML'
    }, { timeout: 15000 });
    
    if (response.data.ok) {
      console.log('✅ Telegram 通知发送成功');
      return true;
    }
  } catch (error) {
    console.log('❌ 通知发送失败:', error.message);
  }
  return false;
}

// =============== 主程序 ===============
async function main() {
  console.log('\n🚀 ========== 机场自动签到脚本 ==========');
  console.log(`⏰ 执行时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
  console.log(`📱 机场名称: ${CONFIG.name}`);
  
  const tokens = getTokens();
  
  if (tokens.length === 0) {
    console.log('\n❌ 未找到有效的Token，脚本终止');
    return;
  }
  
  console.log(`📊 找到 ${tokens.length} 个账号`);
  
  // 执行签到
  const results = [];
  for (let i = 0; i < tokens.length; i++) {
    const result = await checkin(tokens[i], i + 1);
    results.push(result);
    
    if (i < tokens.length - 1) {
      console.log('\n⏳ 等待3秒后继续...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // 统计
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 签到汇总');
  console.log(`${'='.repeat(50)}`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  console.log(`✅ 成功: ${successCount} 个`);
  console.log(`❌ 失败: ${failCount} 个\n`);
  
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.message}`);
    if (r.userInfo) {
      console.log(`   📧 ${r.userInfo.email}`);
      if (r.userInfo.transferUsed > 0 || r.userInfo.transferTotal > 0) {
        console.log(`   📊 ${formatTraffic(r.userInfo.transferUsed)} / ${formatTraffic(r.userInfo.transferTotal)}`);
      }
    }
  });
  
  // 构建通知
  let notifyMsg = `📢 <b>✈️ ${CONFIG.name}签到通知</b>\n\n`;
  notifyMsg += `⏰ ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}\n`;
  notifyMsg += `📊 统计: 成功 ${successCount} / 失败 ${failCount}\n\n`;
  notifyMsg += `${'─'.repeat(30)}\n\n`;
  
  results.forEach((r, index) => {
    const icon = r.success ? '✅' : '❌';
    notifyMsg += `${icon} <b>${r.name}</b>\n`;
    notifyMsg += `   ${r.message}\n`;
    
    if (r.userInfo) {
      notifyMsg += `   📧 账号: <code>${r.userInfo.email}</code>\n`;
      
      if (r.userInfo.transferUsed > 0 || r.userInfo.transferTotal > 0) {
        const used = formatTraffic(r.userInfo.transferUsed);
        const total = formatTraffic(r.userInfo.transferTotal);
        const usedPercent = r.userInfo.transferTotal > 0 
          ? ((r.userInfo.transferUsed / r.userInfo.transferTotal) * 100).toFixed(1)
          : 0;
        
        notifyMsg += `   📊 流量: ${used} / ${total} (${usedPercent}%)\n`;
      } else {
        notifyMsg += `   📊 流量: 试用账号 / 无统计\n`;
      }
      
      if (r.userInfo.deviceLimit) {
        notifyMsg += `   📱 设备限制: ${r.userInfo.deviceLimit} 台\n`;
      }
    }
    
    notifyMsg += '\n';
    if (index < results.length - 1) {
      notifyMsg += `${'─'.repeat(30)}\n\n`;
    }
  });
  
  await sendNotify(`✈️ ${CONFIG.name}签到通知`, notifyMsg);
  
  console.log('\n🎉 脚本执行完成！');
  console.log(`${'='.repeat(50)}\n`);
}

// =============== 执行 ===============
main().catch(err => {
  console.error('\n💥 脚本执行失败:', err);
  process.exit(1);
});
