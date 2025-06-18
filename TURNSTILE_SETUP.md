# Cloudflare Turnstile 人机验证功能

## 功能简介

此功能为 Rin 博客系统添加了 Cloudflare Turnstile 人机验证，可以防止恶意访问和机器人攻击。

### 主要特性

- **智能验证**：3小时内首次访问需要通过人机验证
- **管理员控制**：可在设置页面开启/关闭验证功能
- **无缝体验**：验证通过后24小时内无需重复验证
- **安全可靠**：基于 Cloudflare 的 Turnstile 服务

## 环境变量配置

在你的 `.dev.vars` 文件中添加以下配置：

```bash
TURNSTILE_SITE_KEY=<你的 Turnstile Site Key>
TURNSTILE_SECRET_KEY=<你的 Turnstile Secret Key>
```

### 获取 Turnstile 密钥

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的网站域名
3. 进入 "安全性" → "Turnstile"
4. 创建新的 Turnstile 站点
5. 复制 Site Key 和 Secret Key

## 使用方法

### 1. 管理员设置

1. 登录博客管理员账户
2. 访问设置页面 (`/settings`)
3. 在 "安全设置" 部分找到 "启用人机验证" 开关
4. 开启即可生效（默认已开启）

### 2. 用户体验

- 用户首次访问时会看到人机验证页面
- 完成验证后可正常访问网站
- 验证状态保持3小时，期间无需重复验证
- 验证过程完全自动化，用户体验流畅

## 技术实现

### 服务端 API

- `GET /api/turnstile/config` - 获取 Turnstile 配置
- `POST /api/turnstile/verify` - 验证 Turnstile Token
- `GET /api/turnstile/status` - 检查验证状态

### 客户端组件

- `TurnstileProvider` - 全局验证状态管理
- `TurnstileVerification` - 验证界面组件

### 安全措施

1. **IP验证**：验证请求包含用户真实IP
2. **Token一次性**：每个验证Token只能使用一次
3. **时间限制**：验证有效期为3小时
4. **HTTP-Only Cookie**：验证状态通过HTTP-Only Cookie存储

## 配置选项

在服务端配置中包含以下选项：

- `turnstile.enabled` (boolean): 是否启用验证，默认 `true`
- `turnstile.timeout` (number): 验证超时时间（毫秒），默认 3 小时

## 故障排除

### 常见问题

1. **验证失败**
   - 检查 Site Key 和 Secret Key 是否正确
   - 确认域名配置是否匹配

2. **重复验证**
   - 检查浏览器是否禁用了 Cookie
   - 确认系统时间是否正确

3. **无法加载验证组件**
   - 检查网络连接
   - 确认 Cloudflare 服务是否正常

### 调试模式

在开发环境中，可以通过控制台查看验证状态：

```javascript
// 检查当前验证状态
fetch('/api/turnstile/status')
  .then(r => r.json())
  .then(console.log);
```

## 部署注意事项

1. 确保在 GitHub Actions 中添加了 Turnstile 环境变量
2. 在 wrangler.toml 中配置相应的环境变量
3. 验证域名配置是否正确

---

**注意**：此功能需要有效的 Cloudflare 账户和 Turnstile 服务配置。 