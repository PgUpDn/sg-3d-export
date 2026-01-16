# 🚀 快速部署指南（5分钟）

## 最简单方案：Vercel + Render

### 第一步：准备代码

1. **创建 GitHub 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/sg-3d-export.git
   git push -u origin main
   ```

2. **处理大文件（STL 274MB）**
   
   选项 A: 使用 Git LFS
   ```bash
   git lfs install
   git lfs track "*.stl"
   git add .gitattributes
   git add sg-building-binary.stl
   git commit -m "Add STL file with LFS"
   ```
   
   选项 B: 上传到云存储（推荐）
   - 上传到 Google Drive / Dropbox
   - 在部署脚本中下载

---

### 第二步：部署后端到 Render

1. **访问 https://render.com**
   - 用 GitHub 账号登录
   - 点击 "New" → "Web Service"

2. **连接仓库**
   - 选择你的 GitHub 仓库
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **设置环境变量**
   - `GEMINI_API_KEY`: 你的 Gemini API Key
   - `HOST`: `0.0.0.0`
   - `PORT`: (自动设置)

4. **部署**
   - 点击 "Create Web Service"
   - 等待部署完成（约 5-10 分钟）
   - 复制你的后端 URL，例如：`https://sg-3d-export.onrender.com`

---

### 第三步：部署前端到 Vercel

1. **访问 https://vercel.com**
   - 用 GitHub 账号登录
   - 点击 "Add New" → "Project"

2. **导入仓库**
   - 选择你的 GitHub 仓库
   - Framework Preset: Vite
   - Root Directory: `.` (根目录)

3. **设置环境变量**
   - `VITE_API_URL`: 你的 Render 后端 URL（例如：`https://sg-3d-export.onrender.com`）

4. **部署**
   - 点击 "Deploy"
   - 等待部署完成（约 2-3 分钟）
   - 获得前端 URL，例如：`https://sg-3d-export.vercel.app`

---

### 第四步：更新 CORS（如果需要）

如果前端和后端域名不同，更新 `backend/config.py`:

```python
CORS_ORIGINS: list = [
    "https://sg-3d-export.vercel.app",  # 你的前端域名
    "https://sg-3d-export.onrender.com",  # 你的后端域名
    "*"  # 或允许所有
]
```

然后重新部署后端。

---

## ✅ 完成！

现在你的项目已经公开部署了：
- 前端：`https://your-project.vercel.app`
- 后端：`https://your-project.onrender.com`

---

## 🔧 处理 STL 文件问题

由于 STL 文件太大（274MB），Render 免费版可能无法直接部署。

**解决方案：**

1. **使用云存储（推荐）**
   ```python
   # 修改 backend/services/stl_service.py
   # 从 S3/Google Cloud Storage 下载 STL
   ```

2. **使用 Git LFS**
   ```bash
   git lfs install
   git lfs track "*.stl"
   ```

3. **部署时下载**
   ```bash
   # 在 Render 的 Build Command 中添加：
   wget https://your-storage.com/sg-building-binary.stl -O backend/sg-building-binary.stl
   ```

---

## 🆓 其他免费选项

### Fly.io（后端不休眠）

1. 安装 Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. 登录: `fly auth login`
3. 初始化: `cd backend && fly launch`
4. 部署: `fly deploy`

### Railway（后端）

1. 访问 https://railway.app
2. 连接 GitHub 仓库
3. 选择 `backend` 目录
4. 自动部署

---

## 📝 注意事项

1. **Render 免费版会休眠**
   - 15 分钟无请求后休眠
   - 首次请求需要 30-60 秒唤醒
   - 使用 [UptimeRobot](https://uptimerobot.com) 定期 ping 保持活跃

2. **环境变量安全**
   - 不要在代码中硬编码 API Key
   - 使用平台的环境变量功能

3. **CORS 配置**
   - 确保后端允许前端域名访问

---

## 🐛 常见问题

**Q: Render 部署失败？**
A: 检查 Build Log，可能是依赖问题或 STL 文件太大

**Q: 前端无法连接后端？**
A: 检查 `VITE_API_URL` 环境变量是否正确设置

**Q: CORS 错误？**
A: 更新 `backend/config.py` 中的 `CORS_ORIGINS`

**Q: STL 文件太大？**
A: 使用云存储或 Git LFS
