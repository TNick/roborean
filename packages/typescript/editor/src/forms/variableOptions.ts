import type { Variable, WorkspaceValue } from "@roborean/spec";

import type { DescribedOption } from "./DescribedMenuItem.js";

/**
 * Exposure options with readable labels and help text.
 */
export const EXPOSURE_OPTIONS: DescribedOption<Variable["exposure"]>[] = [
  {
    value: "clientVisible",
    label: "Client visible",
    description:
      "The full value may be shown in the browser UI and client API responses.",
  },
  {
    value: "redactedToClient",
    label: "Redacted to client",
    description:
      "Clients only receive a redacted form of this value. The raw value stays on the backend.",
  },
  {
    value: "backendOnly",
    label: "Backend only",
    description:
      "The value never leaves the backend. It is omitted from client responses and logs.",
  },
];

/**
 * Default value kind options with readable labels and help text.
 */
export const VALUE_KIND_OPTIONS: DescribedOption<WorkspaceValue["kind"]>[] = [
  {
    value: "public_literal",
    label: "Public literal",
    description:
      "A concrete public value stored in the project (for example a string or number).",
  },
  {
    value: "secret_ref",
    label: "Secret reference",
    description:
      "A reference to a secret resolved only on the backend. Project files never store the secret itself.",
  },
  {
    value: "eq_token",
    label: "Equality token",
    description:
      "Store an opaque token instead of the real value. Use it when you need to check whether two values are the same (for example in activation rules with eq/ne) without revealing the underlying data to the client. Tokens match only within the same optional domain.",
  },
  {
    value: "shape_token",
    label: "Shape token",
    description:
      "Describes the shape of a value (for example email) without including the actual data.",
  },
  {
    value: "bucket",
    label: "Bucket",
    description:
      "A coarse category label instead of the precise value (for example a range or group).",
  },
  {
    value: "redacted",
    label: "Redacted",
    description:
      "A placeholder showing that a value was redacted and is not available as real data.",
  },
];
