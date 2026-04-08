const { z, ZodError } = require("zod");
const { HttpError } = require("./errors");

function booleanish(options = {}) {
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

function validate(schema, location) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[location]);

      if (location === "query") {
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, parsed);
      } else {
        req[location] = parsed;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new HttpError(400, "Validation failed", error.flatten()));
        return;
      }

      next(error);
    }
  };
}

module.exports = {
  booleanish,
  validate,
};
