/*
 * @file: jingmeng_wm_remover_v3.js
 * @platform: Loon (script-response-body)
 * @title: 即梦 App 水印去除
 * @version: 3.0
 * @author: Gemini
 *
 * 规则示例 (添加到 [Script] 部分):
^https?:\/\/YOUR_JINGMENG_API_REGEX script-response-body script-path=jingmeng_wm_remover_v3.js, requires-body=true, timeout=10
 */

// ===============================================
// 核心修改逻辑函数：递归查找并修改图片 URL
// ===============================================

function removeWatermark(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => removeWatermark(item));
  }

  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    let value = data[key];
    const originalValue = value;

    // 1. 检查是否为字符串且键名包含图片链接 (url, image, download, pic)
    if (typeof value === 'string' && 
        (key.toLowerCase().includes('url') || key.toLowerCase().includes('image') || key.toLowerCase().includes('download') || key.toLowerCase().includes('pic'))) {
      
      let modifiedUrl = value;
      
      // --- 水印去除策略 (根据即梦App的实际情况调整) ---

      // 策略 A: 移除 URL 中的水印相关查询参数 (?watermark=true, &wm=1, etc.)
      // 匹配 ? 或 & 开头的水印参数，并将其移除
      modifiedUrl = modifiedUrl.replace(/(\?|&)(watermark|wm|logo|stamp|sign)=[^&]+/ig, '');
      
      // 策略 B: 尝试替换路径中的水印文件夹/标记 (/watermarked/ -> /original/)
      modifiedUrl = modifiedUrl.replace(/\/watermark(ed)?\//ig, '/original/');
      
      // 策略 C: 针对性地替换缩略图或预览图标记，以获取高清原图 (/thumb/ -> /full/)
      modifiedUrl = modifiedUrl.replace(/\/thumb(nail)?\//ig, '/full/');
      modifiedUrl = modifiedUrl.replace(/\/preview\//ig, '/original/');

      // 只有当 URL 被修改时才更新值
      if (modifiedUrl !== originalValue) {
        data[key] = modifiedUrl;
        console.log(`[即梦WM] 成功修改 URL:\n  原URL: ${originalValue}\n  新URL: ${modifiedUrl}`);
      }
    }
    
    // 2. 递归处理嵌套的对象或数组
    if (typeof value === 'object' && value !== null) {
      data[key] = removeWatermark(value);
    } 
  }

  return data;
}

// ===============================================
// 脚本主入口
// ===============================================

if (typeof $response === 'undefined' || !$response.body) {
  console.log("[即梦WM] 响应体为空，跳过处理。");
  $done({});
} else {
  let body = $response.body;
  let obj = {};
  
  try {
    obj = JSON.parse(body);
  } catch (e) {
    console.log("[即梦WM] JSON 解析失败。" + e.message);
    $done({});
    return;
  }

  // 执行修改
  const newObj = removeWatermark(obj);

  // 重新打包成 JSON 字符串
  const newBody = JSON.stringify(newObj);

  // 返回新响应体
  if (newBody !== body) {
    console.log(`[即梦WM] 数据修改成功，正在返回新响应体。`);
    $done({body: newBody});
  } else {
    console.log("[即梦WM] 数据未发生变化。");
    $done({});
  }
}

