# 内容发布工作流

网站文章的唯一元数据源是 `/assets/articles.json`。首页“最新文章”、文章列表、搜索、分类和详情页相关阅读均从这个文件读取，不再分别维护多份文章卡片。

## 输入

支持公众号正文整理后的 Markdown 或 JSON：

- 标题与完整正文（必填）
- 日期、摘要、分类、标签、封面、公众号原文链接（可选）
- 公众号图片应合法下载到 `/assets/articles/{slug}/`，正文使用本地路径，禁止长期热链微信图片

JSON 可使用 `title`、`body`、`date`、`excerpt`、`category`、`tags`、`cover`、`wechatUrl`、`featured`、`status`、`contentType` 等字段。Markdown 可在文件顶部使用同名 front matter。

## 执行

```bash
node scripts/add-article.js path/to/article.md
node scripts/add-article.js path/to/article.json
node scripts/add-article.js --classify-test
```

脚本会生成 slug、摘要、主分类、3–6 个复用标签、阅读时间和详情页，随后更新 `articles.json` 与 `sitemap.xml`。首页和文章列表运行时读取 JSON，因此不用再修改 `index.html` 或 `articles/index.html`。

## 分类规则

主分类只能是：获客实战、广告投放、增长方法、行业观察、AI提效。脚本综合标题、摘要和正文关键词判断，每篇文章只有一个主分类。标签优先复用行业、平台和主题标签体系。

如果主分类或内容类型无法可靠判断，脚本会打印“需要人工确认的字段”，并把文章保存为 `draft`。只有 `status: published` 的内容会出现在首页、文章列表、搜索、相关阅读和 sitemap。

## 内容类型

- 经验、观点、教程、方法、行业或平台分析：`article`
- 真实项目、客户问题、诊断和验证结果：`case`
- 计算器、模板、清单或下载资料：`tool` / `resource`
- 咨询、代运营和顾问介绍：`service`

脚本只自动发布 `article`。其他内容类型会停止并提示人工确认，避免错误归入文章区。

## 封面与正文

封面优先级：公众号合法原封面、用户提供封面、`/assets/articles/default-cover.svg`。推荐尺寸 1200×675、比例 16:9。正文必须完整保留标题、段落、二三级标题、引用、列表、加粗、链接和图片；正文图片自动使用 `loading="lazy"`，封面使用 `object-fit: cover`。

## 发布前检查

确认分类、标签、摘要、封面、公众号链接、正文完整性和图片版权；将确认后的 `status` 改为 `published`，再检查文章详情、上一篇/下一篇、相关阅读、首页最新三篇和 sitemap。
