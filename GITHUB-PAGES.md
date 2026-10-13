# 用 GitHub Pages 部署（含 git 入门）

## 0. 先说清楚它是什么

GitHub Pages 不是一个独立的托管网站，而是 **GitHub（代码托管平台）附带的一个功能**：

```
你的文件 ──放进──> 一个"仓库"(repository) ──GitHub 自动──> https://用户名.github.io/仓库名/
```

- **免费**，自动配 HTTPS（这是 PWA 必须的）
- 网址形如 `https://你的用户名.github.io/仓库名/`
- 流量软限制 100GB/月，我们这站 1.4MB，用不完

### 和 Cloudflare Pages 的差别（先看这张表再决定）

| | **GitHub Pages** | **Cloudflare Pages** |
|---|---|---|
| 需要什么 | GitHub 账号 + 一个**公开**仓库 | 一个邮箱账号 |
| 上传方式 | 网页拖文件，或 git 推送 | 拖一个 zip |
| 网址 | `用户名.github.io/仓库名/` | `项目名.pages.dev` |
| 更新 | 再传一次，或 `git push` | 再拖一次 zip |
| 流量 | 100GB/月软限制 | **不限** |
| 隐藏文件 | `.nojekyll` 要手动建 | zip 里已经带上了 |
| 最大好处 | **有版本历史**，能看出每次改了啥 | 快，不用学任何新东西 |

**坦白说**：如果你只是想赶快用上，Cloudflare 更省事。GitHub Pages 的价值在于「以后想长期改这套东西、想看改动历史」——那时候 git 是有回报的。

**两个可以同时挂着**，同一份代码不冲突，哪个方便用哪个。

---

## 路径 A：完全不用 git（约 10 分钟）

这条路你只需要一个浏览器，**不装任何东西**。

### A1. 注册 GitHub

打开 <https://github.com/signup>，用邮箱注册（免费）。

### A2. 建一个空仓库

1. 右上角 **+** → **New repository**
2. **Repository name** 填一个英文名，比如 `my-tools`（它会成为网址的一部分）
3. ⚠️ 必须选 **Public** —— 免费版 GitHub Pages 只支持公开仓库
4. ⚠️ **不要**勾 "Add a README file"、.gitignore、license —— 要一个完全空的仓库
5. 点 **Create repository**

建好后你会看到一个空仓库页面，中间写着 "Quick setup"。

### A3. 上传文件（这一步最容易出错，仔细看）

⚠️ **不要把 `my-apps` 文件夹整个拖进去** —— 那样仓库里会多一层 `my-apps/` 目录，网址就变成 `用户名.github.io/仓库名/my-apps/`，**全站样式和图标都会 404**。

**正确做法**：

1. 打开这个文件夹（Win+R 粘贴）：
   ```
   C:\Users\DELL\Documents\deepseek-harness\default-workspace\my-apps
   ```
2. 按 **Ctrl + A** 全选里面的东西
   （应该选中：`index.html`、`base.css`、`home.css`、`sw.js`、`manifest.webmanifest`、`answer`、`fortune`、`learn`、`jobs`、`icons`、`tools` 等）
3. 回到 GitHub 仓库页面，点 **Add file** → **Upload files**
4. 鼠标按住选中的任意一个文件，**整块拖到页面的虚线框里**
5. 等上传完，底部 Commit changes 区域写一句 `第一次上传`，点 **Commit changes**

上传完成后，仓库根目录应该**直接看到** `index.html`、`base.css`……如果看到的是一个 `my-apps` 目录，说明拖错了，删掉重来。

> ℹ️ `tools/` 那 408KB 建议一起传。它不是网站运行需要的，但里面 `course-parts/` 是**课程内容的源文件**，以后想改课程要用它。

### A4. 补一个 `.nojekyll`（重要，别跳过）

GitHub 默认会拿一个叫 **Jekyll** 的工具去处理你的文件，而 Jekyll 会把 **`_` 开头的文件和目录丢掉**。我们包里有个 `_headers` 是这种。

用一个空文件 `.nojekyll` 就能告诉 GitHub「别处理，原样发出去」。

而且 `.nojekyll` 是点开头的文件，**浏览器拖拽经常会漏掉它**，所以手动建：

1. 仓库页面 → **Add file** → **Create new file**
2. 文件名框里填 `.nojekyll`（就这 9 个字符，前面有个点）
3. 内容框**留空**，什么都不要写
4. 底部 Commit changes → **Commit changes**

点开头文件常被系统隐藏，建好后看不到也正常——GitHub 的文件列表里应该能显示它。

### A5. 开启 Pages

1. 仓库页面 → **Settings**（顶部标签栏）
2. 左栏往下找 → **Pages**
3. **Source** 选 **Deploy from a branch**
4. **Branch** 选 **main**，右边目录选 **/ (root)**
5. 点 **Save**
6. 等 1–5 分钟，刷新这个页面，顶部会出现一行绿字：

   ```
   Your site is live at https://你的用户名.github.io/my-tools/
   ```

### A6. 验证

打开那个网址，逐项确认：

- ✅ 首页是「我的工具箱」，**四个卡片**
- ✅ 点进「每日一课」，看到「Token 到底是什么」
- ✅ 点进「答案之书」，点「翻开」能出答案
- ✅ 图标正常显示（不是白方块）

### A7. 装到 iPhone

**网址和之前不同，所以要重新添加图标**：

Safari 打开 `https://你的用户名.github.io/my-tools/` → 分享 → 添加到主屏幕

再分别打开这四个页面各添加一次：

| 访问 | 图标名 |
|---|---|
| `.../my-tools/answer/` | 答案之书 |
| `.../my-tools/fortune/` | 每日运势 |
| `.../my-tools/jobs/` | 岗位匹配 |
| `.../my-tools/learn/` | 每日一课 |

⚠️ **末尾的斜杠 `/` 要带上**。旧的图标等新的验证通过后再删。

---

## 路径 B：用 git（以后更新方便很多）

### B1. 装 Git for Windows

下载 <https://git-scm.com/download/win>，一路默认安装。

装完**新开一个 PowerShell 窗口**（让 PATH 生效），验证：

```powershell
git --version
```

能打印版本号就成了。

### B2. 告诉 git 你是谁（只需做一次）

```powershell
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

（这个名字和邮箱会出现在每次提交记录里，随便填）

### B3. 在项目里初始化仓库

```powershell
cd C:\Users\DELL\Documents\deepseek-harness\default-workspace\my-apps
git init -b main
git add -A
git commit -m "第一次提交"
```

### B4. 连到 GitHub 并推上去

先在 GitHub 上按 **A2** 建一个**空**仓库，然后：

```powershell
git remote add origin https://github.com/你的用户名/my-tools.git
git push -u origin main
```

第一次推送会弹出浏览器让你登录 GitHub 授权。授权完文件就上去了。

Push 成功后，回到 **A5** 开启 Pages 即可。

### B5. 以后每次更新（这就是 git 的价值）

```powershell
cd C:\Users\DELL\Documents\deepseek-harness\default-workspace\my-apps
git add -A
git commit -m "加了间隔重复复习"
git push
```

GitHub Pages 会在 1–2 分钟内自动重新发布。而且 `git log` 能看到你每次改了什么。

> 别忘了改 `sw.js` 里的缓存版本号（见下面「更新后手机上还是旧的」）。

---

## ⚠️ 两个必须知道的坑

### 坑 1：网址会多一层子目录

免费版 GitHub Pages **只能**部署在 `用户名.github.io/仓库名/`，除非你买自定义域名。

好消息：我当初写这套代码时**所有路径都用的相对路径**（`./icons/...`、`../sw.js`、manifest 的 `start_url: "./"`），就是为了兼容这种子目录部署。你不是在赌运气。

### 坑 2：仓库是公开的

免费版只支持公开仓库，**任何人都能看到你的代码和课程文案**。

需要区分清楚：

| | 在哪 | 会不会泄露 |
|---|---|---|
| 网页代码、图标、180 课文案 | 公开仓库里 | **公开**，谁都能看 |
| 你的运势资料、简历、学习笔记 | **只在你手机浏览器里** | 不会，从来没上传过 |

也就是说：**这个 App 本身是公开的，但里面属于你的数据一步都没离开过手机。** 如果你介意课程文案被别人看到，那就用 Cloudflare Pages（上传的内容一样是公开可访问的，只是不挂在公开代码仓库里）。

---

## 排错表

| 现象 | 原因 | 怎么办 |
|---|---|---|
| 打开是 404 | Pages 还在构建 | 等 2–5 分钟；看 Settings → Pages 顶部的状态 |
| "There isn't a GitHub Pages site here" | Pages 没开，或分支/目录选错 | 回 A5 重选 `main` + `/ (root)` |
| 首页能开，点进工具页全 404 | 上传时**多套了一层目录** | 仓库根目录必须**直接**看到 `index.html`、`answer/`、`learn/`。如果看到 `my-apps/`，说明拖错了文件夹 |
| 图标全是白方块 / 样式全乱 | `.nojekyll` 没建，或 `icons/` `base.css` 没传 | 补 A4；检查根目录文件是否齐全 |
| 上传后仓库里只有几个文件 | Ctrl+A 时没选全，或拖拽中途断了 | 重新 Upload files，它会覆盖同名文件 |
| 改了内容，手机还是旧的 | Service Worker 缓存 | 见下面 |
| `git push` 报 authentication failed | 没授权 | 再 push 一次，会弹浏览器授权；或用 GitHub Desktop |

### 更新后手机上还是旧的

1. 先把 `my-apps/sw.js` 里的 `const CACHE = 'myapps-v4'` 改成 `'myapps-v5'`
2. 重新上传 / `git push`
3. 手机上把每个 App **打开两次**（第一次在后台换缓存，第二次才是新版）

还不行：删掉主屏图标重新添加，或在 iPhone 的 **设置 → Safari → 高级 → 网站数据** 里找到该网站删掉。

---

## 最后：到底选哪个

| 你的情况 | 建议 |
|---|---|
| 只想赶快用上，不想学新东西 | **Cloudflare Pages**（拖一个 zip 完事） |
| 打算长期改这套 App，想看改动历史 | **GitHub Pages**（学 git 一次，以后省事） |
| 两个都试试 | 可以，同一份代码，互不冲突 |

我个人建议：**先用路径 A 把 GitHub Pages 跑通**（不装任何东西，10 分钟），跑通之后再决定要不要学 git。路径 A 上传完，你就已经有一个能用的站点了，git 只是让「以后更新」更舒服而已。
