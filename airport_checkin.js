/*
 * 机场自动签到 - 青龙面板专用
 * cron: 0 8 * * *
 * 环境变量: AIRPORT_TOKEN (必需)
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
      validateStatus: () => true // 接受所有状态码
    });

    console.log(`\n📊 响应状态: ${response.status}`);
    console.log(`📦 响应数据:`, response.data);

    let message = '';
    let success = false;

    if (response.status === 200) {
      success = true;
      const data = response.data;
      
      // 尝试提取消息
      if (typeof data === 'object') {
        message = data.message || data.msg || data.data || JSON.stringify(data);
        
        // 检查是否真的签到成功
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
  try {
    // 尝试使用青龙面板的通知模块
    const notify = require('./sendNotify');
    await notify.sendNotify(title, content);
    console.log('📢 通知已发送');
  } catch (e) {
    console.log('ℹ️ 未配置通知或通知发送失败');
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
