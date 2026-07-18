import { describe, expect, it } from "vitest";
import type { Variable } from "@roborean/spec";

import {
  applyValueType,
  coerceLiteralValue,
  listConstraints,
  literalValidationHelperText,
  PREDEFINED_KEY,
  removeConstraint,
  schemaAllowsNull,
  setConstraint,
  setSchemaNullable,
  validateLiteralAgainstSchema,
  valueTypeFromSchema,
  valueTypeFromVariable,
} from "../src/forms/schemaConstraints.js";

/**
 * Build a sample public-literal variable for schema editor tests.
 *
 * @returns Variable with string schema and default value.
 */
function sampleVariable(): Variable {
  return {
    key: "title",
    exposure: "clientVisible",
    description: "Project title",
    schema: {
      type: "string",
      minLength: 1,
      maxLength: 80,
    },
    defaultValue: {
      kind: "public_literal",
      dataType: "string",
      value: "Hello",
    },
  };
}

describe("schemaConstraints", () => {
  it("derives value type from schema keywords", () => {
    const variable = sampleVariable();
    expect(valueTypeFromVariable(variable)).toBe("string");

    const integerVariable = applyValueType(variable, "integer");
    expect(valueTypeFromVariable(integerVariable)).toBe("integer");
  });

  it("coerces literal values when changing value type", () => {
    const variable = sampleVariable();
    const asInteger = applyValueType(variable, "integer");

    expect(asInteger.schema.type).toBe("integer");
    expect(asInteger.defaultValue).toEqual({
      kind: "public_literal",
      dataType: "number",
      value: 0,
    });
    expect(asInteger.schema.minLength).toBeUndefined();
    expect(asInteger.schema.maxLength).toBeUndefined();
  });

  it("coerces known string numbers to integers", () => {
    const variable: Variable = {
      ...sampleVariable(),
      defaultValue: {
        kind: "public_literal",
        dataType: "string",
        value: "42",
      },
    };

    const next = applyValueType(variable, "integer");
    expect(coerceLiteralValue("42", "integer")).toBe(42);
    expect(next.defaultValue).toEqual({
      kind: "public_literal",
      dataType: "number",
      value: 42,
    });
  });

  it("adds and removes constraints immutably", () => {
    const variable = sampleVariable();
    const withPattern = setConstraint(
      variable.schema,
      "string",
      "pattern",
      "^[A-Z]",
    );

    expect(withPattern).not.toBe(variable.schema);
    expect(withPattern.pattern).toBe("^[A-Z]");
    expect(listConstraints(withPattern, "string")).toHaveLength(3);

    const withoutPattern = removeConstraint(withPattern, "pattern");
    expect(withoutPattern.pattern).toBeUndefined();
    expect(listConstraints(withoutPattern, "string")).toHaveLength(2);
  });

  it("sets date type schema keywords and data type", () => {
    const variable = sampleVariable();
    const asDate = applyValueType(variable, "date");

    expect(asDate.schema).toEqual({
      type: "string",
      format: "date",
    });
    expect(asDate.defaultValue).toEqual({
      kind: "public_literal",
      dataType: "date",
      value: "Hello",
    });
  });

  it("reports constraint failures for invalid default literals", () => {
    const variable = sampleVariable();
    const result = validateLiteralAgainstSchema(variable.schema, "string", "");

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === "minLength")).toBe(
      true,
    );
    expect(literalValidationHelperText(result.issues)).toContain(
      "Minimum length:",
    );
  });

  it("accepts default literals that satisfy constraints", () => {
    const variable = sampleVariable();
    const result = validateLiteralAgainstSchema(
      variable.schema,
      "string",
      "Valid title",
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("derives value type from nullable schema type arrays", () => {
    expect(
      valueTypeFromSchema({ type: ["string", "null"], minLength: 1 }),
    ).toBe("string");
    expect(valueTypeFromSchema({ type: ["integer", "null"] })).toBe("integer");
    expect(schemaAllowsNull({ type: ["string", "null"] })).toBe(true);
    expect(schemaAllowsNull({ type: "string" })).toBe(false);
  });

  it("toggles schema nullability while preserving constraints", () => {
    const schema = { type: "string", minLength: 1 };
    const nullable = setSchemaNullable(schema, true);

    expect(nullable.type).toEqual(["string", "null"]);
    expect(nullable.minLength).toBe(1);

    const nonNullable = setSchemaNullable(nullable, false);
    expect(nonNullable.type).toBe("string");
  });

  it("preserves nullability and predefined values when changing type", () => {
    const variable: Variable = {
      ...sampleVariable(),
      schema: {
        type: ["string", "null"],
        [PREDEFINED_KEY]: [{ value: "draft", label: "Draft copy" }],
      },
      defaultValue: {
        kind: "public_literal",
        dataType: "string",
        value: null,
      },
    };

    const asInteger = applyValueType(variable, "integer");

    expect(asInteger.schema.type).toEqual(["integer", "null"]);
    expect(asInteger.schema[PREDEFINED_KEY]).toEqual([
      { value: "draft", label: "Draft copy" },
    ]);
    expect(asInteger.defaultValue.value).toBe(null);
  });

  it("adds predefined values as a removable constraint", () => {
    const variable = sampleVariable();
    const withPredefined = setConstraint(
      variable.schema,
      "string",
      PREDEFINED_KEY,
      [{ value: "low", label: "Low priority" }, { value: "high" }],
    );

    expect(listConstraints(withPredefined, "string")).toHaveLength(3);
    expect(
      listConstraints(withPredefined, "string").some(
        (constraint) => constraint.key === PREDEFINED_KEY,
      ),
    ).toBe(true);
  });

  it("accepts null literals only when the schema allows null", () => {
    const nullableSchema = { type: ["string", "null"], minLength: 1 };
    const nullableResult = validateLiteralAgainstSchema(
      nullableSchema,
      "string",
      null,
    );
    expect(nullableResult.valid).toBe(true);

    const nonNullableResult = validateLiteralAgainstSchema(
      sampleVariable().schema,
      "string",
      null,
    );
    expect(nonNullableResult.valid).toBe(false);
  });

  it("preserves null when coercing with a nullable schema", () => {
    const schema = { type: ["integer", "null"] };
    expect(coerceLiteralValue(null, "integer", schema)).toBe(null);
    expect(coerceLiteralValue(null, "integer")).toBe(0);
  });
});
