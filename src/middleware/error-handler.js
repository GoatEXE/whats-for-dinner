const { HttpError } = require("../lib/errors");

function errorHandler(error, _req, res, next) {
  void next;
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message =
    error instanceof HttpError ? error.message : "Internal server error";

  if (!(error instanceof HttpError)) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: {
      message,
      details: error instanceof HttpError ? (error.details ?? null) : null,
    },
  });
}

module.exports = {
  errorHandler,
};
