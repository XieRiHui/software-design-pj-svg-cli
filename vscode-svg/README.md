# SVG Navigator

这是 Lab1 Phase 2 第一部分的 VSCode 扩展。它不修改 SVG 文件，只在 VSCode
界面中补充两类导航信息：

- Explorer 中为 `.svg` 文件显示 `[]` 徽标。
- SVG 文本编辑器的原生 Outline 中显示元素嵌套层级，点击节点可定位到开始标签。

## 安装与启动

```bash
cd vscode-svg
npm install
npm test
npm run compile
```

在 VSCode 中打开本目录，按 `F5` 启动 Extension Development Host。随后打开
`samples/outline-demo.svg`，在 Explorer 中查看 `[]` 标记，并打开 Outline
视图查看 `svg > g#flowchart > rect#start` 等层级。也可执行：

```bash
npm run package
code --install-extension vscode-svg-navigator-0.1.0.vsix
```

## 实现边界

- 文件标记由 `vscode.FileDecorationProvider` 提供；它只接收 URI 并返回
  `{ badge, tooltip, color }`，不触碰文件系统，也不改写文件名。
- Outline 由 `vscode.DocumentSymbolProvider` 提供。轻量解析器维护标签栈，
  生成范围、选择范围和子节点；XML 暂时不完整时返回空数组，扩展不会退出。
- 支持注释、XML 声明、DOCTYPE、CDATA、单双引号属性及自闭合标签。它不负责
  完整 SVG 规范校验，也不提供图形预览。
- Outline 在文档内容变化后由 VSCode 重新调用 provider，因此无需额外缓存或
  手工刷新。

## 与模式的关系

VSCode 是宿主和调度者：它发现 `.svg` 资源、打开文档、触发 provider 调用，
并决定装饰或符号如何显示。插件负责注册 provider 和提供纯数据。

文件装饰使用独立的 `FileDecorationProvider` 对象，不包装原文件对象，因此
不是经典 Decorator 的包装链；它更接近为宿主提供视图元数据的 Adapter。
若把“文件对象 + 装饰能力”组合成包装对象，才符合经典 Decorator。大纲中
`SvgOutlineNode -> vscode.DocumentSymbol` 的转换则属于对象适配。

Phase 1 的词法分析针对命令语法，SVG DOM 解析针对 XML 文档，两者不能直接
复用。可复用的是分层遍历思路和“容器包含子节点”的树模型概念；CLI 的
`Shape` 模型不能直接作为 VSCode 文档符号，因为前者面向编辑与序列化，后者
需要源码范围并允许不支持编辑的任意标签。
