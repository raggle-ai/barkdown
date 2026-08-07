# KaTeX formula test

## Inline formulas

- Subscripts: $Z_{0..n}$
- Fractions: $\frac{1}{x}$
- Inequalities: $\operatorname{Re}(z) > 0$ and $\operatorname{Re}(z) < 0$
- Styled text: **$\frac{e^2}{1-x}$**
- Accents: $\tilde{a}$
- An escaped currency value: \$20,000,000

## Display formulas

$$
A_i = B_i + C_i \sum_{k=0}^{i} D_k E^k + dx
$$

$$
f(x) = \frac{\Gamma(\frac{n+1}{2})}{\sqrt{n\pi}\Gamma(\frac{n}{2})}
\left(1 + \frac{x^2}{n}\right)^{-\frac{n+1}{2}}
$$

$$
\Gamma(x) = \int_{0}^{+\infty} t^{x-1}e^{-t}\,dt
$$

## Matrices

$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$

$$
\left\{
\begin{matrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{matrix}
\right\}
$$

## Code is not parsed as math

```php
$subject = $this->secureHeader($subject);
$params = [$kind, $address, $name];
$this->setError($errorMessage);
```

## Formulas in a table

| Type | Example |
| --- | --- |
| Data | $Z_{0..n}$ |
| Formula | $\frac{1}{(x-1)^2}$ |
