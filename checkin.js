/**
 * 机场签到脚本 - 增强版
 * @author binasi
 * @version 1.0.0
 * @description 自动获取Cookie并执行签到
 * @homepage https://github.com/binasi/loon-scripts
 */

const $ = new Env('机场签到');

// ============ 配置区域 ============
const configs = [
    {
        name: '我的机场',
        domain: '7m9gi9norz.1095813.xyz',
        checkinUrl: 'https://7m9gi9norz.1095813.xyz/api/v1/user/trial/checkin',
        cookie: 'user_device_id=6fc208d3f9c34f8e880df9ceb351809d; user_device_id_timestamp=1761714395338; dark_mode=0; crisp-client%2Fsession%2F73cbaaf8-cb6d-4c90-9c26-9d656ff4603a=session_50a2e371-898d-4134-8052-f67e0f402b4a',
    }
];

// Cookie 存储的 key
const COOKIE_KEY = 'airport_cookie_v2';

// ============ Cookie 获取功能 ============
function getCookie() {
    if (typeof $request !== 'undefined') {
        const url = $request.url;
        const headers = $request.headers;
        const cookie = headers['Cookie'] || headers['cookie'];
        
        // 调试信息
        console.log('========== Cookie 获取调试 ==========');
        console.log('请求URL:', url);
        console.log('所有Headers:', JSON.stringify(headers, null, 2));
        console.log('Cookie值:', cookie);
        console.log('=====================================');
        
        if (cookie) {
            // 保存 Cookie
            const saved = $.setdata(cookie, COOKIE_KEY);
            console.log('Cookie保存结果:', saved);
            
            $.msg(
                '✅ Cookie获取成功', 
                '', 
                `URL: ${url}\n\nCookie已保存\n\n请在脚本中查看完整日志`
            );
        } else {
            $.msg(
                '❌ Cookie获取失败', 
                '', 
                `URL: ${url}\n\n未找到Cookie\n\n请检查:\n1. 是否已登录\n2. URL匹配规则是否正确\n3. 查看Loon日志获取详细信息`
            );
        }
        
        $.done({});
    }
}

// ============ 签到功能 ============
async function checkin() {
    let messages = [];
    
    for (let config of configs) {
        try {
            // 获取保存的 Cookie
            let cookie = config.cookie || $.getdata(COOKIE_KEY);
            
            console.log(`========== ${config.name} 签到开始 ==========`);
            console.log('使用的Cookie:', cookie ? '已获取' : '未获取');
            
            if (!cookie) {
                const msg = 'Cookie未获取，请先访问机场网站登录';
                messages.push(`${config.name}: ❌ ${msg}`);
                console.log(msg);
                continue;
            }
            
            const options = {
                url: config.checkinUrl,
                headers: {
                    'Cookie': cookie,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Content-Type': 'application/json;charset=utf-8',
                    'Referer': `https://${config.domain}/user`,
                    'Origin': `https://${config.domain}`
                },
                body: '{}'
            };
            
            console.log('请求URL:', options.url);
            
            const response = await httpPost(options);
            console.log('响应状态:', response.response.status);
            console.log('响应内容:', response.body);
            
            const data = JSON.parse(response.body);
            
            // 判断签到结果（兼容多种返回格式）
            if (
                data.ret === 1 || 
                data.code === 0 || 
                data.status === 'success' ||
                (data.msg && (data.msg.includes('成功') || data.msg.includes('已签到'))) ||
                (data.message && (data.message.includes('成功') || data.message.includes('已签到')))
            ) {
                const msg = data.msg || data.message || data.data || '签到成功';
                messages.push(`${config.name}: ✅ ${msg}`);
                console.log(`签到成功: ${msg}`);
            } else {
                const errMsg = data.msg || data.message || data.error || '签到失败';
                messages.push(`${config.name}: ❌ ${errMsg}`);
                console.log(`签到失败: ${errMsg}`);
            }
            
        } catch (e) {
            const errMsg = e.message || e.toString();
            messages.push(`${config.name}: ❌ 错误 - ${errMsg}`);
            console.log(`执行出错:`, e);
        }
        
        console.log(`========== ${config.name} 签到结束 ==========\n`);
        await $.wait(2000);
    }
    
    // 发送通知
    $.msg('机场签到结果', `共 ${configs.length} 个机场`, messages.join('\n'));
    $.done();
}

// ============ HTTP 请求函数 ============
function httpPost(options) {
    return new Promise((resolve, reject) => {
        $.post(options, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                resolve({ response, body });
            }
        });
    });
}

// ============ 环境函数 ============
function Env(name) {
    return {
        name: name,
        setdata: (val, key) => {
            const result = $persistentStore.write(val, key);
            console.log(`写入持久化存储 [${key}]:`, result ? '成功' : '失败');
            return result;
        },
        getdata: (key) => {
            const val = $persistentStore.read(key);
            console.log(`读取持久化存储 [${key}]:`, val ? '有数据' : '无数据');
            return val;
        },
        msg: (title, subtitle, content) => {
            $notification.post(title, subtitle, content);
        },
        wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        post: (options, callback) => $httpClient.post(options, callback),
        done: (value = {}) => $done(value)
    };
}

// ============ 主执行逻辑 ============
(async () => {
    if (typeof $request !== 'undefined') {
        // Cookie 获取模式
        getCookie();
    } else {
        // 签到模式
        await checkin();
    }
})();
