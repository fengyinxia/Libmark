# Libmark 角色卡解析器 - 部署指南

## 项目概述

这是一个 SillyTavern 角色卡解析器，支持通过 URL 或文件上传解析角色卡图片。项目包含前端界面和 Cloudflare Pages Functions 后端代理服务。

## 功能特性

- ✅ 纯前端角色卡解析
- ✅ URL 链接解析支持
- ✅ 文件上传解析支持
- ✅ Pages Functions 图片代理
- ✅ 自动重试机制
- ✅ 图片缓存优化
- ✅ Discord 链接格式处理
- ✅ 响应式设计

## 部署到 Cloudflare Pages

### 方法一：通过 Cloudflare Dashboard

1. **登录 Cloudflare Dashboard**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 选择 "Pages" 服务

2. **创建新项目**
   - 点击 "Create a project"
   - 选择 "Upload assets" 或连接 Git 仓库

3. **上传文件**
   - 将以下文件上传到 Pages：
     - `index.html`
     - `script.js`
     - `styles.css`
     - `functions/` 目录（包含 `api/proxy-image.js`）

4. **配置 Pages Functions**
   - 确保 `functions` 目录在项目根目录
   - Pages 会自动识别并部署 Functions

### 方法二：使用 Wrangler CLI

1. **安装 Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **部署项目**
   ```bash
   wrangler pages deploy . --project-name=libmark-character-parser
   ```

## 项目结构

```
libmark/
├── index.html              # 主页面
├── script.js               # 前端逻辑
├── styles.css              # 样式文件
├── functions/              # Pages Functions
│   └── api/
│       └── proxy-image.js  # 图片代理API
├── wrangler.toml           # Wrangler 配置
└── DEPLOYMENT.md           # 部署说明
```

## API 端点

### GET /api/proxy-image

图片代理端点，用于解决 CORS 问题和处理特殊格式。

**参数：**
- `url` (必需): 要代理的图片 URL

**示例：**
```
GET /api/proxy-image?url=https://example.com/image.png
```

**响应：**
- 成功：返回图片二进制数据
- 失败：返回 JSON 错误信息

## 配置说明

### 环境变量

在 `wrangler.toml` 中配置：

```toml
[vars]
ENVIRONMENT = "production"
MAX_FILE_SIZE = "10485760"  # 10MB
CACHE_TTL = "3600"  # 1小时
```

### 缓存设置

- 图片缓存时间：1小时
- 缓存键：基于图片 URL 的 Base64 编码
- 缓存位置：Cloudflare Edge 缓存

## 功能说明

### 前端功能

1. **URL 解析**
   - 支持直接输入图片 URL
   - 自动处理 Discord 链接格式问题
   - 带重试机制的图片获取

2. **文件上传**
   - 支持拖拽上传
   - 仅接受 PNG 格式
   - 实时文件信息显示

3. **角色卡解析**
   - 支持 V2 和 V3 格式
   - 提取角色信息、描述、首条消息等
   - 支持世界书条目解析

### 后端功能

1. **图片代理**
   - 解决 CORS 跨域问题
   - 处理 Discord 等平台的格式限制
   - 自动清理 URL 参数

2. **缓存优化**
   - Edge 缓存提升性能
   - 减少重复请求
   - 智能缓存策略

3. **错误处理**
   - 统一错误响应格式
   - 详细的错误信息
   - 超时和重试机制

## 使用说明

1. **访问应用**
   - 部署后访问 Pages 提供的 URL
   - 或使用自定义域名

2. **解析角色卡**
   - 选择 "URL链接" 标签页输入图片链接
   - 或选择 "文件上传" 标签页上传本地文件
   - 点击解析按钮开始解析

3. **查看结果**
   - 解析成功后显示角色信息
   - 可以保存图片或 JSON 数据
   - 支持复制 JSON 到剪贴板

## 故障排除

### 常见问题

1. **CORS 错误**
   - 确保使用 Pages Functions 代理
   - 检查 API 端点是否正确

2. **图片解析失败**
   - 确认图片包含角色卡数据
   - 检查图片格式是否为 PNG
   - 避免使用 Discord 等平台的直接链接

3. **缓存问题**
   - 清除浏览器缓存
   - 检查 Cloudflare 缓存设置

### 调试模式

在浏览器控制台查看详细日志：
- 图片获取过程
- 解析步骤
- 错误信息

## 性能优化

1. **缓存策略**
   - 图片缓存 1 小时
   - 减少重复请求
   - 提升加载速度

2. **重试机制**
   - 最多重试 3 次
   - 指数退避策略
   - 提高成功率

3. **文件大小限制**
   - 最大 10MB
   - 防止滥用
   - 保护服务器资源

## 安全考虑

1. **URL 验证**
   - 仅允许 HTTP/HTTPS 协议
   - 防止恶意请求

2. **文件大小限制**
   - 限制图片大小
   - 防止资源滥用

3. **超时设置**
   - 30秒请求超时
   - 防止长时间占用资源

## 更新维护

1. **代码更新**
   - 修改代码后重新部署
   - 使用 Wrangler CLI 或 Dashboard

2. **配置调整**
   - 修改 `wrangler.toml`
   - 重新部署生效

3. **监控日志**
   - 查看 Cloudflare 日志
   - 监控错误和性能

## 支持

如有问题，请检查：
1. 浏览器控制台错误信息
2. Cloudflare Pages 日志
3. 网络连接状态
4. 图片 URL 有效性
