/*
 * 文件名: jingmeng_wm_remover.js
 * 平台: Loon (script-response-body)
 * 功能: 尝试修改即梦 App API 响应中的图片 URL，以获取无水印版本。
 * 作者: Gemini
 */

(function() {
  // 检查响应体是否存在
  if (typeof $response === 'undefined' || !$response.body) {
    console.log("Jingmeng WM Remover: 响应体为空或不存在，跳过处理。");
    $done({});
    return;
  }

  let body = $response.body;
  let obj = {};

  try {
    // 尝试解析 JSON 响应体
    obj = JSON.parse(body);
  } catch (e) {
    console.log("Jingmeng WM Remover: JSON 解析失败。" + e.message);
    $done({});
    return;
  }

  console.log("Jingmeng WM Remover: 成功解析 JSON，开始修改...");

  // --- 核心 URL 修改函数 ---
  function processObject(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // 处理数组
    if (Array.isArray(data)) {
      return data.map(item => processObject(item));
    }

    // 处理对象
    for (const key in data) {
      // 避免处理继承属性
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

      const value = data[key];

      // 1. 检查是否为字符串且键名包含 'url'、'image' 或 'download' (不区分大小写)
      if (typeof value === 'string' && 
          (key.toLowerCase().includes('url') || key.toLowerCase().includes('image') || key.toLowerCase().includes('download'))) {
        
        let originalUrl = value;
        let modifiedUrl = value;

        // --- 水印去除策略 (根据即梦App的实际情况调整) ---

        // 策略 A: 移除 URL 中的水印相关查询参数
        // 常见的参数如 ?watermark=true 或 &wm=1 或 &logo=1
        // 注意：此正则可能会移除其他参数，请谨慎使用或针对性修改
        modifiedUrl = modifiedUrl.replace(/(\?|&)(watermark|wm|logo|stamp)=[^&]+/ig, '');
        
        // 策略 B: 尝试替换路径中的水印文件夹/标记
        // 示例：将 /watermarked/ 替换为 /original/ 或 /full/
        modifiedUrl = modifiedUrl.replace(/\/watermark(ed)?\//ig, '/original/');
        
        // 策略 C: 如果发现有 'thumb' (缩略图) 或 'preview' 标记，尝试替换为 'full' 或 'original'
        modifiedUrl = modifiedUrl.replace(/\/thumb(nail)?\//ig, '/full/');
        modifiedUrl = modifiedUrl.replace(/\/preview\//ig, '/original/');
        
        // 如果 URL 被修改了，则更新对象
        if (modifiedUrl !== originalUrl) {
          data[key] = modifiedUrl;
          console.log(`Jingmeng WM Remover: 成功修改 URL:\n  原URL: ${originalUrl}\n  新URL: ${modifiedUrl}`);
        }
      }
      
      // 2. 递归处理嵌套的对象或数组
      if (typeof value === 'object') {
        data[key] = processObject(value);
      }
    }

    return data;
  }

  // 对解析后的 JSON 对象执行处理
  const newObj = processObject(obj);

  // 将修改后的对象重新打包成 JSON 字符串
  const newBody = JSON.stringify(newObj);

  // 返回新的响应体
  $done({body: newBody});
  
})();



[MITM]
# 步骤 1: 将此处的域名替换为即梦 App 实际使用的 API 域名。
# 示例：假设即梦App使用 api.jingmeng.app
hostname = api.jingmeng.app, YOUR_JINGMENG_API_HOST

[Script]
# 步骤 2: 替换下方正则表达式为您实际抓取到的、返回图片 JSON 数据的 API 接口。
# 示例：假设图片链接在 /api/v1/image/download 接口返回
# 需要开启 requires-body=true 才能读取和修改响应体。
^https?:\/\/(www\.)?YOUR_JINGMENG_API_REGEX script-response-body script-path=jingmeng_wm_remover.js, requires-body=true, timeout=10


