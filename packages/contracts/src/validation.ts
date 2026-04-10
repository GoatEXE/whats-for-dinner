import { z } from "zod";

export interface BooleanishOptions {
  strict?: boolean;
}

export function booleanish(options: BooleanishOptions = {}) {
  const strict = options.strict === true;

  return z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (strict) {
        if (value === "true") {
          return true;
        }

        if (value === "false") {
          return false;
        }

        return value;
      }

      return value.toLowerCase() === "true";
    }

    return value;
  }, z.boolean());
}
