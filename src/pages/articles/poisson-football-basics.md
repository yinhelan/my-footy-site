---
layout: ../../layouts/PostLayout.astro
title: Poisson distribution for football goals
---
---

## What problem Poisson solves
When you want to estimate the probability that a team scores 0/1/2... goals, the Poisson model is a simple baseline.

## The formula
P(k; λ) = e^{-λ} * λ^k / k!

## How to estimate λ
Use recent matches to get average goals; calibrate with league average & home advantage.

## From single-team goals to scoreline
Assume independence; multiply two teams' goal distributions to get P(i,j).

## Next
Try the calculator: [/tools/poisson](/tools/poisson)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Poisson for Football: Basics",
  "datePublished": "2025-09-05",
  "author": { "@type": "Person", "name": "Footy Analytics" },
  "mainEntityOfPage": "https://my-footy-site.pages.dev/articles/poisson-football-basics/"
}
</script>

<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"BreadcrumbList",
  "itemListElement":[
    { "@type":"ListItem","position":1,"name":"Home","item":"https://my-footy-site.pages.dev/" },
    { "@type":"ListItem","position":2,"name":"Articles","item":"https://my-footy-site.pages.dev/articles/" },
    { "@type":"ListItem","position":3,"name":"Poisson for Football: Basics","item":"https://my-footy-site.pages.dev/articles/poisson-football-basics/" }
  ]
}
</script>
