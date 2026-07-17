# Rule semantics

Roborean rules use a small, canonical AST dialect. A rule node contains an
`op` and an `args` array. Rules are evaluated in strict mode by default.

| Operator | Arguments | Result |
| --- | --- | --- |
| `and`, `or` | Rule AST values | Boolean conjunction or disjunction |
| `not` | One Rule AST | Boolean negation |
| `eq`, `ne` | Two Rule AST values | Equality or inequality |
| `lt`, `le`, `gt`, `ge` | Two Rule AST values | Ordered comparison |
| `has` | A variable key or `var` AST | Whether the key is present |
| `const` | One JSON scalar | The scalar literal |
| `var` | One variable key | The workspace value for the key |

`var` evaluates a `public_literal` wrapper to its `value`. A missing variable
causes `RuleEvalError` in strict mode. A lenient evaluator may instead return
`null`; it is not the Phase 1 default.

`has` is the exception: a missing key evaluates to `false` and does not raise
an error. It may receive either a key directly or a `var` expression.

Numbers use IEEE-754 float64 semantics. There is no integer/float distinction.
Strings compare in UTF-8 code-unit order. Boolean operators require Boolean
operands, and ordered comparisons require compatible ordered operands.

`secret_ref` values are not comparable and using one in a rule is a typecheck
error. Other non-literal workspace wrappers are also not implicitly unwrapped
for comparisons.
