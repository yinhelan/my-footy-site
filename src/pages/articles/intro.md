---
layout: ../../layouts/ArticleLayout.astro
title: 写在前面：站点定位与结构
description: 用最小可依赖的方式，做可复用的足球模型工具与备忘。
date: 2025-09-15
tags: [site, intro]
hero: /og-default.svg
---
本站以 **Poisson → Fair Odds → Kelly** 的单线闭环为核心：
- **数据输入**简单、边界可控；
- **计算逻辑**抽象为 `src/lib/*.ts` 便于复用；
- **页面**零框架运行时，全部原生 `<script type="module">`。

你可以从「[Match Insights](/tools/match-insights/)」开始，按步骤跑通闭环。
