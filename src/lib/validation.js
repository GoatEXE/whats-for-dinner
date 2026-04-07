const { ZodError } = require("zod");
const { HttpError } = require("./errors");

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
  validate,
};
