# 🔧 故障排除：Failed to fetch

## 🔍 问题诊断

"Failed to fetch" 通常表示前端无法连接到后端 API。

---

## ✅ 检查步骤

### 1. 检查后端服务是否运行

在浏览器中直接访问后端健康检查：
```
https://sg-3d-export.onrender.com/api/health
```

**预期结果：**
```json
{"status":"healthy","service":"SG 3D Export API",...}
```

**如果返回错误：**
- 后端可能还在部署中（等待 5-10 分钟）
- 后端可能休眠了（Render 免费版 15 分钟无请求会休眠）
- 首次请求需要 30-60 秒唤醒

---

### 2. 检查环境变量

在 Vercel Dashboard：
- Settings → Environment Variables
- 确认 `VITE_API_URL` 已设置
- 值应该是：`https://sg-3d-export.onrender.com`（无末尾斜杠）

**重新部署前端：**
- 修改环境变量后需要重新部署
- Deployments → Redeploy

---

### 3. 检查 CORS 配置

后端需要允许前端域名访问。

**在 Render 环境变量中添加：**
```
CORS_ORIGINS=https://sg-3d-export-dpzwovfjs-xinyus-projects-eac7e082.vercel.app,https://sg-3d-export.vercel.app,*
```

**或者修改代码：**

编辑 `backend/config.py`，更新 CORS_ORIGINS：
```python
CORS_ORIGINS: list = [
    "https://sg-3d-export-dpzwovfjs-xinyus-projects-eac7e082.vercel.app",
    "https://sg-3d-export.vercel.app",
    "https://sg-3d-export-*.vercel.app",  # 通配符支持
    "*"  # 或允许所有（开发环境）
]
```

然后重新部署后端。

---

### 4. 检查浏览器控制台

打开浏览器开发者工具（F12）：
- **Console** 标签：查看具体错误信息
- **Network** 标签：查看 API 请求
  - 请求 URL 是否正确
  - 状态码是什么（404, 500, CORS 错误等）

---

## 🛠️ 快速修复

### 方案 1: 更新 CORS 配置（推荐）

1. **在 Render Dashboard 添加环境变量：**
   ```
   CORS_ORIGINS=https://sg-3d-export-dpzwovfjs-xinyus-projects-eac7e082.vercel.app,https://sg-3d-export.vercel.app,*
   ```

2. **重新部署后端**

### 方案 2: 修改代码支持所有 Vercel 域名

更新 `backend/config.py`：

```python
# 允许所有 Vercel 预览域名
CORS_ORIGINS: list = [
    "https://sg-3d-export.vercel.app",
    "https://sg-3d-export-*.vercel.app",
    "https://*.vercel.app",  # 所有 Vercel 域名
    "*"  # 或直接允许所有
]
```

然后：
```bash
git add backend/config.py
git commit -m "Update CORS to allow Vercel domains"
git push
```

---

## 🔍 详细诊断

### 检查后端日志

在 Render Dashboard：
- Logs 标签
- 查看是否有错误信息
- 查看 CORS 相关错误

### 测试 API 端点

```bash
# 健康检查
curl https://sg-3d-export.onrender.com/api/health

# 测试 CORS（从浏览器控制台）
fetch('https://sg-3d-export.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

## 📝 常见错误

### CORS 错误
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
**解决：** 更新 CORS_ORIGINS 环境变量或代码

### 404 Not Found
```
GET https://sg-3d-export.onrender.com/api/... 404
```
**解决：** 检查 API 路径是否正确

### 503 Service Unavailable
后端可能休眠了，等待 30-60 秒后重试

### Network Error
后端可能未部署成功，检查 Render 部署状态

---

## ✅ 验证修复

修复后，在浏览器控制台测试：

```javascript
// 测试 API 连接
fetch('https://sg-3d-export.onrender.com/api/health')
  .then(response => response.json())
  .then(data => console.log('✅ Backend connected:', data))
  .catch(error => console.error('❌ Error:', error));
```

如果看到 `✅ Backend connected`，说明修复成功！
