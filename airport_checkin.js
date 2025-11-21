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
};

// =============== 获取Token ===============
function getTokens() {
  const token = process.env.AIRPORT_TOKEN || '';
  if (!token) {
    console.log('❌ 错误：未配置 AIRPORT_TOKEN 环境变量');
    console.log('\n📝 配置方法：');
    console.log('1. 进入青龙面板 -> 环境变量');
    console.log('2. 新建变量：AIRPORT_TOKEN');
    console.log('3. 变量值填入你的授权Token');
    return [];
  }
  // 支持多账号：用 & 或换行分隔
  return token.split(/[&\n]/).map(t => t.trim()).filter(t => t);
}

// =============== 签到函数 ===============
async function checkin(token, index) {
  const name = `账号${index}`;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`【${name}】开始签到`);
  console.log(`${'='.repeat(50)}`);
  
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

    if (response.status === 200) {
      success = true;
      const data = response.data;
      
      if (typeof data === 'object') {
        message = data.message || data.msg || data.data || JSON.stringify(data);
        
        if (data.ret === 0 || data.code === 0 || data.status === 'success') {
          console.log(`✅ 【${name}】签到成功！`);
        } else if (data.message && data.message.includes('重复')) {
          console.log(`ℹ️ 【${name}】今天已签到过`);
          message = '今天已签到过';
        } else {
          console.log(`✅ 【${name}】签到完成`);
        }
      } else {
        message = String(data);
        console.log(`✅ 【${name}】签到成功`);
      }
    } else {
      console.log(`❌ 【${name}】签到失败`);
      message = `HTTP ${response.status}: ${JSON.stringify(response.data)}`;
    }

    console.log(`📝 签到信息: ${message}`);
    
    return { success, name, message, data: response.data };

  } catch (error) {
    console.log(`❌ 【${name}】签到异常`);
    
    let errorMsg = '';
    if (error.response) {
      errorMsg = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      console.log(`📛 服务器返回:`, error.response.data);
    } else if (error.request) {
      errorMsg = '网络超时或无响应';
      console.log(`📛 网络错误: 请检查网络连接`);
    } else {
      errorMsg = error.message;
      console.log(`📛 错误:`, error.message);
    }
    
    return { success: false, name, message: errorMsg, error: errorMsg };
  }
}

// =============== 发送通知 ===============
async function sendNotify(title, content) {
  // 方法1: 尝试使用青龙面板的 sendNotify
  try {
    let notify;
    const paths = [
      './sendNotify.js',
      './sendNotify',
      '../sendNotify.js',
      '/ql/scripts/sendNotify.js',
      '/ql/scripts/sendNotify'
    ];
    
    for (const path of paths) {
      try {
        notify = require(path);
        console.log(`📢 找到 sendNotify 模块: ${path}`);
        await notify.sendNotify(title, content);
        console.log('✅ 通知发送成功（sendNotify）');
        return true;
      } catch (e) {
        // 继续尝试下一个路径
      }
    }
  } catch (e) {
    console.log('ℹ️ sendNotify 模块不可用');
  }
  
  // 方法2: 使用 Telegram Bot API
  const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const TG_USER_ID = process.env.TG_USER_ID || process.env.TELEGRAM_CHAT_ID || process.env.TG_CHAT_ID;
  
  console.log('\n🔍 Telegram 配置检查:');
  console.log(`  TG_BOT_TOKEN: ${TG_BOT_TOKEN ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  TG_USER_ID: ${TG_USER_ID ? '✅ 已配置' : '❌ 未配置'}`);
  
  if (!TG_BOT_TOKEN || !TG_USER_ID) {
    console.log('❌ Telegram 环境变量未完整配置，跳过通知');
    return false;
  }
  
  try {
    const message = `📢 ${title}\n\n${content}`;
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    
    console.log(`📤 正在发送 Telegram 通知...`);
    
    const response = await axios.post(url, {
      chat_id: TG_USER_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }, {
      timeout: 15000
    });
    
    if (response.data.ok) {
      console.log('✅ Telegram 通知发送成功');
      return true;
    } else {
      console.log('❌ Telegram API 返回失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Telegram 通知发送失败:', error.message);
    if (error.response) {
      console.log('   API 错误:', error.response.data);
      if (error.response.status === 401) {
        console.log('   提示: Bot Token 可能不正确');
      } else if (error.response.status === 400) {
        console.log('   提示: Chat ID 可能不正确');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.log('   提示: 请求超时，可能网络问题或需要代理访问 Telegram');
    }
    return false;
  }
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
    
    // 多账号间隔3秒
    if (i < tokens.length - 1) {
      console.log('\n⏳ 等待3秒后继续...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // 统计结果
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 签到汇总');
  console.log(`${'='.repeat(50)}`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  console.log(`✅ 成功: ${successCount} 个`);
  console.log(`❌ 失败: ${failCount} 个`);
  console.log('');
  
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.message}`);
  });
  
  // 构建并发送通知
  let notifyMsg = `⏰ ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}\n\n`;
  notifyMsg += `📊 统计: 成功 ${successCount} / 失败 ${failCount}\n\n`;
  notifyMsg += `📝 详情:\n`;
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    notifyMsg += `${icon} ${r.name}\n   ${r.message}\n\n`;
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
