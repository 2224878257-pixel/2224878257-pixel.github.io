#!/usr/bin/env python3
"""Import exported WeChat articles into the static portfolio.

Usage:
  python scripts/import_weixin_articles.py <export-directory>

The exporter keeps only article content, moves embedded images into assets,
classifies every article, and refreshes the four category landing pages.
"""

from __future__ import annotations

import base64
import html as html_lib
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from lxml import etree, html


ROOT = Path(__file__).resolve().parents[1]
IMPORT_START = "<!-- WEIXIN_IMPORT_START -->"
IMPORT_END = "<!-- WEIXIN_IMPORT_END -->"


@dataclass(frozen=True)
class Article:
    title: str
    slug: str
    category: str
    label: str
    excerpt: str
    body: str
    image_count: int


# Explicit mapping keeps URLs stable when the importer is run again.
CATALOG = {
    "100条线索，80个不到店：到底是广告不准，还是门店根本没接住？": ("articles", "leads-not-arriving", "投放增长"),
    "2026家装建材到底怎么获客？8大主流渠道一次讲全，别再死磕一个平台": ("articles", "home-improvement-acquisition-channels", "本地获客"),
    "2026年，一人公司opc最好的变现方式，不是做产品，也不是做自媒体": ("articles", "opc-monetization", "一人公司"),
    "爆款素材不是想出来的：拆解、测试、衍生三步法": ("workflows", "creative-testing-workflow", "素材工作流"),
    "参加一个OPC交流会后，我发现很多人还没想清楚怎么落地": ("articles", "opc-implementation", "一人公司"),
    "抖音、小红书、视频号、美团、高德都投了，为什么还是没效果？解决方法来了": ("articles", "multi-channel-no-results", "全域获客"),
    "豆包工作正式发布！这次AI真开始“替你干活”了": ("tools", "doubao-work", "AI 工具"),
    "广告优化师，是时候用AI打造一个每日学习系统了": ("workflows", "ad-optimizer-learning-system", "学习工作流"),
    "很多老板不知道，在正式开始投放之前，最应该先做好这两件事情": ("articles", "before-running-ads", "投放增长"),
    "很多老板都想自己投广告，认为很简单？直到撞了南墙才知道投放没那么简单": ("articles", "why-ad-buying-is-hard", "投放增长"),
    "接手旧账户第一周，我必做的7件事（附检查清单）": ("workflows", "old-account-first-week", "账户工作流"),
    "老板们看过来，投广告前不要急着定预算，先查这4个地方": ("articles", "ad-budget-four-checks", "投放增长"),
    "你的广告账户不是被平台搞废的，是你自己喂废的": ("articles", "how-accounts-learn", "账户优化"),
    "钱花出去了，效果不知道在哪儿？教你3步算清你的广告ROI": ("articles", "calculate-ad-roi", "ROI"),
    "少投点试试？这话害了多少广告主": ("articles", "small-budget-testing-trap", "投放增长"),
    "为什么你的同行天天有客户，你却没有人咨询？问题出在这3个地方": ("articles", "why-competitors-get-leads", "获客增长"),
    "我把管理知识库这件事，直接交给Codex了": ("tools", "codex-knowledge-base", "Codex"),
    "我的AI工具使用技巧大公开，学会这4招工作效率直接飞起~": ("articles", "ai-tool-productivity-tips", "AI 提效"),
    "我用codex做了一个极简业务管理系统，做一人公司的都来看看": ("tools", "codex-business-system", "Codex"),
    "我用WorkBuddy做了一个求职系统，找工作效率提升10倍": ("tools", "workbuddy-job-system", "求职工具"),
    "县城做装修还值得投抖音吗？先算清这3笔账，再决定投不投": ("articles", "county-decoration-douyin", "本地获客"),
    "信息流投放线索质量差，一定要先检查这5个环节，看完你就明白了": ("articles", "lead-quality-five-checks", "线索质量"),
    "一个小游戏项目转化很差，老板怀疑是假量，我是怎么分析的": ("cases", "game-ads-diagnosis-original", "真实案例"),
    "直播间几千人，没人互动也没成交，老板怀疑是快手给了假流量，真的是这样吗？": ("cases", "kuaishou-live-diagnosis-original", "真实案例"),
    "最近，我用ChatGPT把学习效率提升了好几倍": ("tools", "chatgpt-learning-assistant", "学习工具"),
    "做了8年广告投放，我发现老板最容易犯的5个错误": ("articles", "five-advertiser-mistakes", "投放增长"),
    "做了几年广告代投，我发现：真正亏钱的客户，都有这5个特征": ("articles", "unprofitable-ad-clients", "客户判断"),
    "AI工作流实战：一个投手如何完成一个团队的内容产能": ("workflows", "ai-content-production", "内容工作流"),
    "AI素材能不能投？2026年先过这4道授权检查": ("articles", "ai-creative-licensing", "合规"),
    "ChatGPT Work 来了，投手最先该交出去的 5 项工作": ("workflows", "chatgpt-work-for-media-buyers", "AI 工作流"),
    "ROI一掉，团队不要急着互相甩锅，先把这4段链路拆清楚再说": ("workflows", "roi-four-stage-diagnosis", "增长诊断"),
    "ROI一直上不去？我做投放8年，总结出这5个账户诊断步骤": ("workflows", "five-step-account-diagnosis", "广告诊断"),
}

CATEGORY_META = {
    "articles": ("ARTICLE", "公众号文章", "/articles/"),
    "cases": ("CASE", "案例原文", "/cases/"),
    "workflows": ("WORKFLOW", "工作流原文", "/workflows/"),
    "tools": ("TOOL", "工具原文", "/tools/"),
}

DROP_TAGS = {"script", "style", "iframe", "mp-common-profile", "mp-style-type", "noscript", "svg"}
KEEP_TAGS = {"p", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "strong", "b", "em", "i", "a", "img", "br", "hr", "figure", "figcaption", "code", "pre"}


def normalized_title(path: Path) -> str:
    return re.sub(r"_\d+$", "", path.stem).strip()


def image_extension(mime: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
    }.get(mime.lower(), ".bin")


def extract_data_image(value: str) -> tuple[str, bytes] | None:
    match = re.match(r"data:([^;,]+);base64,(.+)", value, re.S)
    if not match:
        return None
    try:
        return match.group(1), base64.b64decode(match.group(2))
    except Exception:
        return None


def unwrap(node: etree._Element) -> None:
    parent = node.getparent()
    if parent is None:
        return
    index = parent.index(node)
    if node.text:
        if index == 0:
            parent.text = (parent.text or "") + node.text
        else:
            previous = parent[index - 1]
            previous.tail = (previous.tail or "") + node.text
    for child in list(node):
        node.remove(child)
        parent.insert(index, child)
        index += 1
    if node.tail:
        if index == 0:
            parent.text = (parent.text or "") + node.tail
        else:
            previous = parent[index - 1]
            previous.tail = (previous.tail or "") + node.tail
    parent.remove(node)


def clean_article(path: Path, slug: str, title: str) -> tuple[str, str, int]:
    document = html.fromstring(path.read_text(encoding="utf-8"))
    try:
        content = document.get_element_by_id("js_content")
    except KeyError:
        bodies = document.xpath("//body")
        content = bodies[0] if bodies else document

    for node in list(content.xpath(".//*")):
        style = (node.get("style") or "").replace(" ", "").lower()
        if node.tag in DROP_TAGS or "display:none" in style:
            node.drop_tree()

    asset_dir = ROOT / "assets" / "weixin" / slug
    asset_dir.mkdir(parents=True, exist_ok=True)
    image_count = 0
    for image in list(content.xpath(".//img")):
        candidates = [image.get("src", ""), image.get("data-src", "")]
        embedded = next((extract_data_image(v) for v in candidates if extract_data_image(v)), None)
        if embedded:
            mime, payload = embedded
            image_count += 1
            destination = asset_dir / f"image-{image_count:02d}{image_extension(mime)}"
            destination.write_bytes(payload)
            image.set("src", f"/assets/weixin/{slug}/{destination.name}")
        else:
            source = image.get("data-src") or image.get("src")
            if not source:
                image.drop_tree()
                continue
            image.set("src", source)
            image_count += 1
        current_alt = (image.get("alt") or "").strip()
        image.set("alt", current_alt if current_alt and current_alt != "图片" else f"{title}配图 {image_count}")
        image.set("loading", "lazy")
        image.set("decoding", "async")

    for node in list(content.xpath(".//*")):
        if node.tag not in KEEP_TAGS:
            unwrap(node)
            continue
        allowed = {"href", "title"} if node.tag == "a" else {"src", "alt", "loading", "decoding"} if node.tag == "img" else set()
        for key in list(node.attrib):
            if key not in allowed:
                del node.attrib[key]
        if node.tag == "a" and (node.get("href") or "").startswith(("http://", "https://")):
            node.set("target", "_blank")
            node.set("rel", "noopener noreferrer")

    for node in list(content.xpath(".//p|.//h2|.//h3|.//h4|.//li|.//blockquote")):
        text = " ".join("".join(node.itertext()).replace("\xa0", " ").split())
        if not text and not node.xpath(".//img|.//br"):
            node.drop_tree()

    body = "\n".join(etree.tostring(child, encoding="unicode", method="html") for child in content)
    plain = " ".join(" ".join(content.itertext()).replace("\xa0", " ").split())
    excerpt = plain[:90].rstrip("，。；：、 ") + ("…" if len(plain) > 90 else "")
    return body, excerpt, image_count


def page_html(article: Article) -> str:
    kicker, _, back_path = CATEGORY_META[article.category]
    title = html_lib.escape(article.title)
    description = html_lib.escape(article.excerpt, quote=True)
    return f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/article-detail.css">
<meta name="description" content="{description}">
<title>{title}｜老侯</title>
</head>
<body>
<header class="nav"><div class="wrap nav-inner">
<a class="brand" href="/#top">老侯 / AI × Growth</a>
<nav class="nav-links"><a href="/#projects">Projects</a><a href="/cases/">Cases</a><a href="/articles/">Writing</a><a href="/workflows/">Workflows</a><a href="/tools/">Tools</a><a href="/#follow">Follow</a></nav>
</div></header>
<main>
<section class="article-hero"><div class="article-wrap">
<div class="kicker">{kicker} · 微信公众号原文</div>
<h1>{title}</h1>
<div class="article-meta"><span>老侯聊增长</span><span>公众号文章归档</span></div>
</div></section>
<section class="article-section"><article class="article-wrap article-card article-body">
{article.body}
<div class="article-end"><p>本文来自「老侯聊增长」公众号文章归档。</p><a href="{back_path}">← 返回{CATEGORY_META[article.category][1]}</a></div>
</article></section>
</main>
<footer class="footer">© 2026 老侯 · AI × Growth · Built on GitHub Pages</footer>
</body>
</html>
'''


def card_html(article: Article) -> str:
    tags = f'<div class="tags"><span class="tag">{article.image_count} 张配图</span></div>' if article.image_count else ''
    return (
        '<article class="card item-card">'
        f'<div class="item-kicker">{html_lib.escape(article.label)}</div>'
        f'<h3>{html_lib.escape(article.title)}</h3>'
        f'<p>{html_lib.escape(article.excerpt)}</p>'
        f'{tags}'
        f'<a class="arrow-link" href="/{article.category}/{article.slug}.html">阅读全文 →</a>'
        '</article>'
    )


def update_index(category: str, articles: list[Article]) -> None:
    index = ROOT / category / "index.html"
    source = index.read_text(encoding="utf-8")
    pattern = re.compile(re.escape(IMPORT_START) + r".*?" + re.escape(IMPORT_END), re.S)
    cards = "\n".join(card_html(a) for a in articles)
    section = (
        f'{IMPORT_START}<section class="section weixin-library"><div class="wrap">'
        f'<div class="grid-3">{cards}</div></div></section>{IMPORT_END}'
    )
    if pattern.search(source):
        source = pattern.sub(section, source)
    else:
        source = source.replace("</main>", section + "</main>")
    index.write_text(source, encoding="utf-8", newline="\n")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: import_weixin_articles.py <export-directory>")
    source_dir = Path(sys.argv[1]).resolve()
    files = sorted(source_dir.glob("*.html"))
    found_titles = {normalized_title(path) for path in files}
    missing = set(CATALOG) - found_titles
    unknown = found_titles - set(CATALOG)
    if missing or unknown:
        raise SystemExit(f"Catalog mismatch. Missing={sorted(missing)} Unknown={sorted(unknown)}")

    articles: list[Article] = []
    for path in files:
        title = normalized_title(path)
        category, slug, label = CATALOG[title]
        body, excerpt, image_count = clean_article(path, slug, title)
        article = Article(title, slug, category, label, excerpt, body, image_count)
        destination = ROOT / category / f"{slug}.html"
        destination.write_text(page_html(article), encoding="utf-8", newline="\n")
        articles.append(article)

    for category in CATEGORY_META:
        update_index(category, [a for a in articles if a.category == category])

    print(f"Imported {len(articles)} articles")
    for category in CATEGORY_META:
        print(f"{category}: {sum(a.category == category for a in articles)}")
    print(f"images: {sum(a.image_count for a in articles)}")


if __name__ == "__main__":
    main()
