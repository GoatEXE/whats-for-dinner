const { ZodError } = require("zod");
const { HttpError } = require("./errors");

function validate(schema, location) {
  return (req, _res, next) => {
    try {
      req[location] = schema.parse(req[location]);
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
