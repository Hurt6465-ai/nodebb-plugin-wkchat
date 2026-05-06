# nodebb-plugin-wkchat 19.10.14

WKChat 会话列表 NodeBB 插件版。

## 重点

- 会话列表页接管 `[component="chat/nav-wrapper"]`，具体聊天页 `/chats/{roomId}` 自动释放接管。
- 悟空 SDK `chatManager.addMessageListener` 实时驱动会话列表。
- `/conversation/sync` 保留为首屏、返回列表、重连和低频兜底。
- SDK 已连接：45 秒低频校验。
- SDK 未连接：30 秒兜底同步。
- 默认不启用 WebSocket tap，避免全局 patch WebSocket。
- 多语言：`zh-CN`、`en-GB`、`my-MM`、`my`。

## 安装

把整个 `nodebb-plugin-wkchat` 目录放到 NodeBB 的 `node_modules/`：

```bash
cd /path/to/NodeBB
unzip nodebb-plugin-wkchat-19.10.14.zip -d node_modules/
./nodebb build
./nodebb restart
```

然后在 ACP -> Extend -> Plugins 启用 `nodebb-plugin-wkchat`，再执行：

```bash
./nodebb build
./nodebb restart
```

## 重要

启用插件前，请清空 ACP -> Appearance/Customise 里旧的 WKChat Custom JS / Custom CSS，避免同一套逻辑重复运行。

## 调试

浏览器控制台：

```js
WKChat.debugNow()
WKChat.forceSyncNow()
WKChat.startRealtime && WKChat.startRealtime()
WKChat.dumpTop(10)
```

`debugNow()` 里重点看：

- `sdkRealtime`
- `sdkConnected`
- `sdkLastError`
- `tokenEnsured`
- `bridgeBases`

