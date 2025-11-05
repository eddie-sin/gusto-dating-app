const sanitizeHtml = require("sanitize-html");

function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      obj[key] = sanitizeHtml(obj[key], {
        allowedTags: [], // block all HTML tags
        allowedAttributes: {}, // block all attributes
      });
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

module.exports = function xssSanitizer(req, res, next) {
  ["body", "query", "params"].forEach((key) => {
    if (req[key]) sanitizeObject(req[key]);
  });
  next();
};
