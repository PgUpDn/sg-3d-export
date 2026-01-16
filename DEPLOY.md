# 免费部署方案

## 🚀 推荐方案（最简单）

### 方案 1: Vercel (前端) + Render (后端) ⭐ 推荐

**优点：**
- 完全免费（有使用限制但足够用）
- 自动 HTTPS
- 自动部署（Git push 即部署）
- 全球 CDN

**步骤：**

#### 前端部署到 Vercel

1. **准备环境变量文件**
   ```bash
   # 创建 .env.production
   VITE_API_URL=https://your-backend.onrender.com
   ```

2. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

3. **部署**
   ```bash
   cd /path/to/project
   vercel
   ```

   或通过 GitHub：
   - 推送代码到 GitHub
   - 访问 https://vercel.com
   - 导入 GitHub 仓库
   - 自动部署

#### 后端部署到 Render

1. **创建 `render.yaml`** (已创建，见下方)

2. **在 Render 网站**
   - 访问 https://render.com
   - 注册账号（GitHub 登录）
   - 点击 "New" → "Web Service"
   - 连接 GitHub 仓库
   - 选择 `backend` 目录
   - 使用 `render.yaml` 配置

---

### 方案 2: Netlify (前端) + Railway (后端)

**优点：**
- Netlify 免费额度很大
- Railway 每月 $5 免费额度（足够用）

**步骤：**

#### 前端部署到 Netlify

1. **创建 `netlify.toml`** (已创建)

2. **部署**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

#### 后端部署到 Railway

1. 访问 https://railway.app
2. 连接 GitHub 仓库
3. 选择 `backend` 目录
4. Railway 自动检测 Python 并部署

---

### 方案 3: 完全免费 - GitHub Pages + Render

**限制：**
- GitHub Pages 只支持静态网站（前端）
- 需要配置 API 代理或使用 Render 后端

---

## 📝 部署前准备

### 1. 环境变量配置

**前端 `.env.production`:**
```env
VITE_API_URL=https://your-backend.onrender.com
```

**后端环境变量（在 Render/Railway 设置）:**
```env
GEMINI_API_KEY=your_gemini_api_key
HOST=0.0.0.0
PORT=8000
```

### 2. STL 文件处理

由于 STL 文件很大（274MB），有几个选项：

**选项 A: 使用云存储**
- 上传到 AWS S3 / Google Cloud Storage / Cloudflare R2
- 修改代码从云存储下载

**选项 B: 使用 Git LFS**
```bash
git lfs install
git lfs track "*.stl"
git add .gitattributes
git add sg-building-binary.stl
```

**选项 C: 部署时下载**
- 在部署脚本中从外部源下载 STL 文件

### 3. 修改 API 地址

部署后，更新前端 API 地址：
```typescript
// services/apiService.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-backend.onrender.com';
```

---

## 🔧 配置文件

### Render 配置 (`render.yaml`)

```yaml
services:
  - type: web
    name: sg-3d-export-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: GEMINI_API_KEY
        sync: false
      - key: HOST
        value: 0.0.0.0
      - key: PORT
        fromService:
          type: web
          name: sg-3d-export-backend
          property: port
```

### Netlify 配置 (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel 配置 (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📊 各平台免费额度对比

| 平台 | 免费额度 | 限制 |
|------|---------|------|
| **Vercel** | 100GB 带宽/月 | 个人项目完全免费 |
| **Netlify** | 100GB 带宽/月 | 个人项目完全免费 |
| **Render** | 750 小时/月 | 免费服务会休眠（15分钟无请求后） |
| **Railway** | $5 免费额度/月 | 约 500 小时运行时间 |
| **Fly.io** | 3 个共享 CPU 实例 | 完全免费 |

---

## 🎯 推荐组合

**最佳组合：Vercel + Render**
- 前端：Vercel（全球 CDN，速度快）
- 后端：Render（免费，但会休眠）

**如果需要后端不休眠：**
- 前端：Vercel
- 后端：Railway（$5 免费额度，不休眠）

**完全免费且不休眠：**
- 前端：Vercel
- 后端：Fly.io（完全免费，不休眠）

---

## 🚨 注意事项

1. **STL 文件大小**
   - 274MB 太大，需要特殊处理
   - 建议使用云存储或 Git LFS

2. **Render 休眠问题**
   - 免费服务 15 分钟无请求会休眠
   - 首次请求需要 30-60 秒唤醒
   - 可以使用 UptimeRobot 定期 ping 保持活跃

3. **环境变量安全**
   - 不要在代码中硬编码 API Key
   - 使用平台的环境变量功能

4. **CORS 配置**
   - 确保后端允许前端域名访问
   - 更新 `backend/config.py` 中的 CORS_ORIGINS

---

## 📚 详细部署步骤

见各平台的官方文档：
- [Vercel 文档](https://vercel.com/docs)
- [Render 文档](https://render.com/docs)
- [Railway 文档](https://docs.railway.app)
- [Netlify 文档](https://docs.netlify.com)
