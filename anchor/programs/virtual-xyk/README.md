
# Introduction

Virtual xyk is a very simple idea, just use 
constant product curve but add virtual liquidity
(SOL) on one side, while token being launched 
is on the other side. 

> IMPORTANT: This is not production ready code, it is just a proof of concept.

# How it works
Say X is SOL, Y is the token being launched. 
Then the equation is:
```
(X + x + c) (Y - y) = (X + c) Y 
```
Solving for y:
```
y = Y - ((X + c) Y) / (X + x + c)
```

Hence, given `x` input, the output `y` is above.
Compare this to traditional constant product curve.

```
(X + x) (Y - y) = XY
```
Solving for y:
```
y = Y - (XY) / (X + x)
```

## Solving for x
(X - x + c) (Y + y) = (X + c) Y

Solving for x:
```
x = X + c - (X + c) Y / (Y + y)
```
