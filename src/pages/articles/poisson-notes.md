---
layout: ../../layouts/ArticleLayout.astro
title: 泊松模型笔记（足球）
description: λ 的估计、截断误差与比分矩阵构造（含 Top 5 结果）。
date: 2025-09-14
updated: 2025-09-15
tags: [poisson, math, notes]
---
### 1) λ 的估计
- 常见：基于进攻/防守强度、主客场因子与联赛均值的对数线性模型；
- 简化：历史均值 + 回归因子（Shrinkage），避免样本过少导致的方差过大。

### 2) 截断误差
当 K 取值较小（例如 5~6）时，比分矩阵尾部被截断。我们的实现会输出 `cutoff = 1 - sum`，建议 `cutoff < 0.5%`；否则增大 K。

### 3) Top scorelines
模型展示 Top 5 比分及其概率，便于快速体感分布。
