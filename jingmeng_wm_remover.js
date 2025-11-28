/*
 * 文件名: jingmeng_wm_remover_v2.js
 * 平台: Loon (script-response-body)
 * 功能: 即梦 App 水印去除脚本 (基于通用模板)
 * 作者: Gemini
 */

/**
 * 核心修改逻辑函数 - 递归查找并修改图片 URL
 * @param {Object|Array} data 待处理的 JSON 对象或数组
 * @returns {Object|Array} 处理后的 JSON 对象或数组
 */
function processData(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => processData(item));
  }

  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    let value = data[key];
    const originalValue = value;

    // ===========================================
    // 💡 即梦去水印核心逻辑
    // ===========================================

    // 1. 检查是否为字符串且键名可能包含图片链接 (url, image, download)
    if (typeof value === 'string' && 
        (key.toLowerCase().includes('url') || key.toLowerCase().includes('image') || key.toLowerCase().includes('download'))) {
      
      let modifiedUrl = value;
      
      // 策略 A: 移除 URL 中的水印相关查询参数 (?watermark=true, &wm=1, etc.)
      modifiedUrl = modifiedUrl.replace(/(\?|&)(watermark|wm|logo|stamp)=[^&]+/ig, '');
      
      // 策略 B: 尝试替换路径中的水印文件夹/标记 (/watermarked/ -> /original/)
      modifiedUrl = modifiedUrl.replace(/\/watermark(ed)?\//ig, '/original/');
      
      // 策略 C: 针对性地替换缩略图或预览图标记，以获取高清原图 (/thumb/ -> /full/)
      modifiedUrl = modifiedUrl.replace(/\/thumb(nail)?\//ig, '/full/');
      modifiedUrl = modifiedUrl.replace(/\/preview\//ig, '/original/');

      // 只有当 URL 被修改时才更新值
      if (modifiedUrl !== originalValue) {
        data[key] = modifiedUrl;
        console.log(`[Jingmeng] 成功修改 URL:\n  原URL: ${originalValue}\n  新URL: ${modifiedUrl}`);
      }
    }
    
    // 2. 递归处理嵌套的对象或数组
    if (typeof value === 'object' && value !== null) {
      data[key] = processData(value);
    } 
  }

  return data;
}

// ===========================================
// --- 脚本主入口 ---
// ===========================================

(function() {
  // 确保 $response 存在且有 body
  if (typeof $response === 'undefined' || !$response.body) {
    console.log("[Jingmeng] 响应体为空，跳过处理。");
    $done({});
    return;
  }

  let body = $response.body;
  let obj = {};

  try {
    // 尝试解析 JSON 响应体
    obj = JSON.parse(body);
  } catch (e) {
    console.log(`[Jingmeng] JSON 解析失败。URL: ${$request.url} 错误: ${e.message}`);
    $done({});
    return;
  }

  // 对解析后的 JSON 对象执行处理
  const newObj = processData(obj);

  // 将修改后的对象重新打包成 JSON 字符串
  const newBody = JSON.stringify(newObj);

  // 检查是否发生变化
  if (newBody === body) {
    console.log("[Jingmeng] 数据未发生变化。");
    $done({});
    return;
  }
  
  console.log(`[Jingmeng] 数据修改成功，正在返回新响应体。`);
  // 返回新的响应体
  $done({body: newBody});
  
})();

