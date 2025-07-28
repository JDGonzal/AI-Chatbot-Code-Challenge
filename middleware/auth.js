import jwt from "jsonwebtoken"; // Importing jsonwebtoken for token verification

// Middleware to authenticate requests
export const auth = (req, res, next) => {
  // Get the token from the Authorization header
  const token = req.headers["x-auth-token"];
  // If no token, return unauthorized
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Verify the token using the secret seed
  jwt.verify(token, process.env.AUTH_SEED, (err, decoded) => {
    if (err) {
      console.error("Token verification error:", err);
      // If verification fails, return forbidden
      return res.status(403).json({ error: "Failed to authenticate token" });
    }
    req.user = decoded; // Attach the decoded user information to the request object
    next(); // Proceed to the next middleware or route handler
  });
};
