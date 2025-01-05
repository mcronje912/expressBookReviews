const express = require('express');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

const isValid = (username) => {
  // Return false if the username is not provided
  if (!username) return false;
  
  // Check if the username already exists in our users array
  const existingUser = users.find(user => user.username === username);
  
  // Return true if username is NOT found (meaning it's available)
  return !existingUser;
}

// First, let's update our authenticatedUser function at the top of the file
const authenticatedUser = (username, password) => {
  // Find the user with the provided username and password
  const matchingUser = users.find(user => 
      user.username === username && user.password === password
  );
  
  // Return true if we found a matching user, false otherwise
  return !!matchingUser;
}

// Now let's implement the login endpoint
regd_users.post("/login", (req, res) => {
  try {
      // Extract credentials from request body
      const { username, password } = req.body;

      // First verify that username and password were provided
      if (!username || !password) {
          return res.status(400).json({
              message: "Username and password are required for login"
          });
      }

      // Check if the credentials are valid using our authenticatedUser function
      if (authenticatedUser(username, password)) {
          // If credentials are valid, create a JWT token
          // We'll use a simple payload with username and timestamp
          const accessToken = jwt.sign({
              data: username,
              exp: Math.floor(Date.now() / 1000) + (60 * 60) // Token expires in 1 hour
          }, 'access'); // In production, use a secure secret key

          // Store the token and username in session
          req.session.authorization = {
              accessToken,
              username
          };

          // Return success response with token
          return res.status(200).json({
              message: "Login successful",
              username: username,
              accessToken: accessToken
          });
      } else {
          // If credentials are invalid, return error
          return res.status(401).json({
              message: "Invalid username or password"
          });
      }

  } catch (error) {
      // Handle any unexpected errors
      return res.status(500).json({
          message: "Error during login",
          error: error.message
      });
  }
});

// Add or modify a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
  try {
      // Get user info from session
      if (!req.session.authorization) {
          return res.status(401).json({
              message: "Please login first"
          });
      }

      // Get review details
      const username = req.session.authorization.username;
      const isbn = req.params.isbn;
      const review = req.body.review;

      // Validate inputs
      if (!isbn || !review) {
          return res.status(400).json({
              message: "ISBN and review text are required"
          });
      }

      // Check if book exists
      if (!books[isbn]) {
          return res.status(404).json({
              message: "Book not found"
          });
      }

      // Initialize reviews object if it doesn't exist
      if (!books[isbn].reviews) {
          books[isbn].reviews = {};
      }

      // Add or update the review
      books[isbn].reviews[username] = review;

      return res.status(200).json({
          message: "Review added/updated successfully",
          book: books[isbn].title,
          review: review
      });

  } catch (error) {
      console.error("Review error:", error);
      return res.status(500).json({
          message: "Error processing review"
      });
  }
});

// Add this endpoint after your existing review endpoints
regd_users.delete("/auth/review/:isbn", (req, res) => {
  try {
      // First verify the user is logged in by checking session
      if (!req.session.authorization) {
          return res.status(401).json({
              message: "Please login first to delete a review"
          });
      }

      // Get the username from the session and ISBN from the URL
      const username = req.session.authorization.username;
      const isbn = req.params.isbn;

      // Verify the book exists
      if (!books[isbn]) {
          return res.status(404).json({
              message: "Book not found with ISBN: " + isbn
          });
      }

      // Check if the book has any reviews
      if (!books[isbn].reviews) {
          return res.status(404).json({
              message: "No reviews found for this book"
          });
      }

      // Check if the user has a review for this book
      if (!books[isbn].reviews[username]) {
          return res.status(404).json({
              message: "You haven't reviewed this book yet"
          });
      }

      // Delete the review
      delete books[isbn].reviews[username];

      return res.status(200).json({
          message: "Review deleted successfully",
          book: books[isbn].title
      });

  } catch (error) {
      console.error("Delete review error:", error);
      return res.status(500).json({
          message: "Error while deleting review",
          error: error.message
      });
  }
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
