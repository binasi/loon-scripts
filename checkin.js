[Script]
# 获取Cookie - 访问机场网站时自动获取
http-request ^https?:\/\/.+\.(com|net|org)\/user.* script-path=checkin.js, timeout=10, tag=获取机场Cookie

# 定时签到任务 - 每天早上8点执行
cron "0 8 * * *" script-path=checkin.js, timeout=60, tag=机场每日签到

[MITM]
# 添加你的机场域名，例如：
hostname = 7m9gi9norz.1095813.xyz

/**
 * 机场签到脚本
 * 
 * 使用说明：
 * 1. 先手动访问机场网站进行登录，获取Cookie
 * 2. 配置定时任务每天自动执行签到
 */

const $ = new Env('机场签到');

// 配置区域 - 填写你的机场信息
const configs = [
    {
        name: '机场1',  // 机场名称
        url: 'https://your-airport1.com/user/checkin',  // 签到API地址
        cookie: '',  // Cookie会自动获取，也可手动填写
    },
    // 可以添加多个机场
    // {
    //     name: '机场2',
    //     url: 'https://your-airport2.com/user/checkin',
    //     cookie: '',
    // }
];

// Cookie获取脚本
function getCookie() {
    if (typeof $request !== 'undefined') {
        const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
        const url = $request.url;
        
        if (cookie) {
            $.setdata(cookie, 'airport_cookie');
            $.msg('Cookie获取成功', '', `URL: ${url}\nCookie已保存`);
            console.log(`Cookie: ${cookie}`);
        } else {
            $.msg('Cookie获取失败', '', '请检查配置');
        }
        $.done({});
    }
}

// 签到功能
async function checkin() {
    let messages = [];
    
    for (let config of configs) {
        try {
            // 如果配置中没有cookie，尝试从本地读取
            if (!config.cookie) {
                config.cookie = $.getdata('airport_cookie');
            }
            
            if (!config.cookie) {
                messages.push(`${config.name}: Cookie未配置`);
                continue;
            }
            
            const options = {
                url: config.url,
                headers: {
                    'Cookie': config.cookie,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            };
            
            const response = await httpPost(options);
            const data = JSON.parse(response.body);
            
            // 根据不同机场的返回格式调整
            if (data.ret === 1 || data.code === 0 || data.msg.includes('成功')) {
                const msg = data.msg || data.message || '签到成功';
                messages.push(`${config.name}: ✅ ${msg}`);
                console.log(`${config.name} 签到成功: ${msg}`);
            } else {
                const errMsg = data.msg || data.message || '签到失败';
                messages.push(`${config.name}: ❌ ${errMsg}`);
                console.log(`${config.name} 签到失败: ${errMsg}`);
            }
            
        } catch (e) {
            messages.push(`${config.name}: ❌ 错误 - ${e.message}`);
            console.log(`${config.name} 执行出错: ${e}`);
        }
        
        // 延迟避免请求过快
        await $.wait(2000);
    }
    
    // 发送通知
    const title = '机场签到结果';
    const subtitle = `共 ${configs.length} 个机场`;
    const content = messages.join('\n');
    $.msg(title, subtitle, content);
    $.done();
}

// HTTP POST 请求
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

// Env 类 - Loon 环境支持
function Env(name) {
    return {
        name: name,
        setdata: (val, key) => $persistentStore.write(val, key),
        getdata: (key) => $persistentStore.read(key),
        msg: (title, subtitle, content) => $notification.post(title, subtitle, content),
        wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        get: (options, callback) => $httpClient.get(options, callback),
        post: (options, callback) => $httpClient.post(options, callback),
        done: (value = {}) => $done(value)
    };
}

// 主执行逻辑
(async () => {
    // 如果是获取Cookie的请求
    if (typeof $request !== 'undefined') {
        getCookie();
    } else {
        // 执行签到
        await checkin();
    }
})();
