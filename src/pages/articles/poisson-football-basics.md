---
title: Poisson distribution for football goals
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
