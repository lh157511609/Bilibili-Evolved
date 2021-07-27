# 快捷键设置帮助
在快捷键设置中, 每个动作都配备了 3 套按键, 分别是默认按键, 预设按键和自定义按键 (优先级依次升高). 默认按键由动作自带, 预设按键将根据选择的预设而变化, 如果都不是所希望的按键, 则可以添加自定义按键.

自定义按键提供了一个文本框来输入按键定义 (失去焦点时自动保存), 这是一种特殊的表示键盘按键的写法, 规则为:
- 留空表示永远不会触发 (禁用)
- 直接写下按键的名称 (对应 [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#Properties) 的 `code` 或 `key` 属性)
- 多个按键用空格隔开, 如果按键本身就是空格, 可以用 `space` 来表示
- 可以有一些组合键: `shift` / `ctrl` / `alt` / `meta`, `meta` 在 Windows 上是 Win 键, 在 macOS 上是 Command 键
- 如果希望映射到多种按键, 可以继续用空格隔开, 但注意组合键是固定的, 例如: 配置 `a b` 表示 `A` 或 `B` 键, 而配置 `shift a b` 就表示 `Shift + A` / `Shift + B`
- 组合键是精确匹配的, 按下 `Ctrl + Shift + A` 不能触发配置为 `shift a` 的快捷键
- 如果希望组合键可按可不按, 可以给它套上一个 `[]`, 例如 `[ctrl] shift a` 表示 `Ctrl + Shift +A` / `Shift + A`

## 预设
在第三列的表头中可以通过下拉框切换预设, 预设是一套固定的按键定义, 方便快速切换到用户更熟悉的按键风格中. 插件可以使用 `keymap.presets` 作为 key 添加新的预设.

## 动作
插件可以使用 `keymap.actions` 作为 key 添加新的动作, 动作的默认按键需要添加到 `presetBase` 上.