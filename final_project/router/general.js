const express = require('express');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();


public_users.post("/register", (req, res) => {
  try {
      // Extract username and password from request body
      const { username, password } = req.body;

      // First, let's implement some basic validation
      if (!username || !password) {
          return res.status(400).json({
              message: "Username and password are required for registration"
          });
      }

      // Let's add some basic password strength requirements
      if (password.length < 6) {
          return res.status(400).json({
              message: "Password must be at least 6 characters long"
          });
      }

      // Check if username already exists using the isValid function from auth_users.js
      // We need to implement this function first in auth_users.js
      if (users.find(user => user.username === username)) {
          return res.status(409).json({
              message: "This username is already taken. Please choose another one."
          });
      }

      // If all validation passes, create the new user
      const newUser = {
          username: username,
          password: password  // In a real application, we would hash this password
      };

      // Add the new user to our users array
      users.push(newUser);

      // Return success message
      return res.status(201).json({
          message: "Registration successful! You can now login with your credentials",
          username: username
      });

  } catch (error) {
      return res.status(500).json({
          message: "Error during registration",
          error: error.message
      });
  }
});
// First, let's create a helper function that simulates an asynchronous book fetch
// This mimics real-world scenarios where we might be fetching from a database
const fetchBooks = async (callback) => {
  try {
      // Simulate network delay with setTimeout
      setTimeout(() => {
          // Get all books and pass them to the callback
          const allBooks = books;
          callback(null, allBooks);
      }, 1000); // 1 second delay to simulate network latency
  } catch (error) {
      // If there's an error, pass it to the callback
      callback(error, null);
  }
};

// Now let's modify our existing get books endpoint to use async/await
public_users.get('/async/books', function (req, res) {
  // Using our async function with a callback
  fetchBooks(async (err, books) => {
      if (err) {
          // If there's an error in fetching books
          return res.status(500).json({
              message: "Error fetching books",
              error: err.message
          });
      }

      try {
          // Process the books data
          const bookList = Object.entries(books).map(([isbn, book]) => ({
              isbn: isbn,
              title: book.title,
              author: book.author,
              reviews: book.reviews
          }));

          // Send the processed book list
          res.status(200).json({
              message: "Books retrieved successfully",
              total_books: bookList.length,
              books: bookList
          });

      } catch (processError) {
          res.status(500).json({
              message: "Error processing books data",
              error: processError.message
          });
      }
  });
});
// First, let's create a Promise-based function to find a book by ISBN
const getBookByISBN = (isbn) => {
  return new Promise((resolve, reject) => {
      try {
          // Simulate a small network delay
          setTimeout(() => {
              // Check if the book exists
              const book = books[isbn];
              if (book) {
                  // If found, resolve with the book data
                  resolve({
                      isbn: isbn,
                      ...book
                  });
              } else {
                  // If not found, reject with an error
                  reject(new Error(`Book with ISBN ${isbn} not found`));
              }
          }, 1000); // 1 second delay to simulate database query
      } catch (error) {
          reject(error);
      }
  });
};

// Now create the endpoint that uses this Promise-based function
public_users.get('/async/isbn/:isbn', function (req, res) {
  // Get the ISBN from the request parameters
  const isbn = req.params.isbn;

  // Use our Promise-based function
  getBookByISBN(isbn)
      .then(book => {
          // If the book was found, send it in the response
          res.status(200).json({
              message: "Book retrieved successfully using Promises",
              book: book
          });
      })
      .catch(error => {
          // Handle any errors that occurred
          // Check if it's a "not found" error or something else
          if (error.message.includes('not found')) {
              res.status(404).json({
                  message: error.message
              });
          } else {
              res.status(500).json({
                  message: "Error occurred while fetching book",
                  error: error.message
              });
          }
      });
});

// We can also create a version using async/await for comparison
public_users.get('/async/isbn-await/:isbn', async function (req, res) {
  try {
      const isbn = req.params.isbn;
      const book = await getBookByISBN(isbn);
      
      res.status(200).json({
          message: "Book retrieved successfully using async/await",
          book: book
      });
  } catch (error) {
      if (error.message.includes('not found')) {
          res.status(404).json({
              message: error.message
          });
      } else {
          res.status(500).json({
              message: "Error occurred while fetching book",
              error: error.message
          });
      }
  }
});
  
// First, let's create a Promise-based function to search books by author
const searchBooksByAuthor = (authorName) => {
  return new Promise((resolve, reject) => {
      try {
          setTimeout(() => {
              // Create an array to hold matching books
              const matchingBooks = [];
              
              // Search through all books
              Object.keys(books).forEach(isbn => {
                  // Make the search case-insensitive
                  const bookAuthor = books[isbn].author.toLowerCase();
                  const searchAuthor = authorName.toLowerCase();
                  
                  // Check if this book's author matches our search
                  if (bookAuthor.includes(searchAuthor)) {
                      matchingBooks.push({
                          isbn: isbn,
                          author: books[isbn].author,
                          title: books[isbn].title,
                          reviews: books[isbn].reviews
                      });
                  }
              });

              // If we found any books, resolve with the results
              if (matchingBooks.length > 0) {
                  resolve({
                      count: matchingBooks.length,
                      books: matchingBooks
                  });
              } else {
                  // If no books found, reject with an informative error
                  reject(new Error(`No books found for author: ${authorName}`));
              }
          }, 1000); // Simulate network delay
      } catch (error) {
          reject(error);
      }
  });
};

// Create the endpoint using async/await for clean error handling
public_users.get('/async/author/:author', async (req, res) => {
  try {
      const authorName = req.params.author;
      
      // Input validation
      if (!authorName.trim()) {
          return res.status(400).json({
              message: "Author name cannot be empty"
          });
      }

      // Await the search results
      const result = await searchBooksByAuthor(authorName);
      
      // Send successful response
      res.status(200).json({
          message: "Books retrieved successfully",
          author_search: authorName,
          result: result
      });

  } catch (error) {
      // Handle different types of errors appropriately
      if (error.message.includes('No books found')) {
          res.status(404).json({
              message: error.message
          });
      } else {
          res.status(500).json({
              message: "Error occurred while searching for books",
              error: error.message
          });
      }
  }
});


// First, let's create our Promise-based function for searching books by title
const searchBooksByTitle = (searchTitle) => {
  return new Promise((resolve, reject) => {
      try {
          setTimeout(() => {
              // Create an array for our search results
              const matchingBooks = [];
              
              // Helper function to normalize text for better matching
              const normalizeText = (text) => {
                  return text.toLowerCase()
                            .trim()
                            .replace(/\s+/g, ' '); // Replace multiple spaces with single space
              };

              const searchTerm = normalizeText(searchTitle);
              
              // Search through our books
              Object.keys(books).forEach(isbn => {
                  const bookTitle = normalizeText(books[isbn].title);
                  
                  // Check if this book's title matches our search
                  if (bookTitle.includes(searchTerm)) {
                      matchingBooks.push({
                          isbn: isbn,
                          title: books[isbn].title,  // Keep original title for display
                          author: books[isbn].author,
                          reviews: books[isbn].reviews,
                          matchQuality: bookTitle === searchTerm ? "exact" : "partial" // Track match quality
                      });
                  }
              });

              // Sort results: exact matches first, then partial matches
              matchingBooks.sort((a, b) => {
                  if (a.matchQuality === b.matchQuality) return 0;
                  return a.matchQuality === "exact" ? -1 : 1;
              });

              if (matchingBooks.length > 0) {
                  resolve({
                      searchTerm: searchTitle,
                      totalMatches: matchingBooks.length,
                      books: matchingBooks
                  });
              } else {
                  reject(new Error(`No books found with title containing: "${searchTitle}"`));
              }
          }, 1000); // Simulate network delay
      } catch (error) {
          reject(error);
      }
  });
};

// Create the async endpoint for title search
public_users.get('/async/title/:title', async (req, res) => {
  try {
      const searchTitle = req.params.title;
      
      // Input validation
      if (!searchTitle.trim()) {
          return res.status(400).json({
              message: "Search title cannot be empty",
              hint: "Please provide a title to search for"
          });
      }

      // Await our search results
      const searchResults = await searchBooksByTitle(searchTitle);
      
      // Return successful response with search information
      res.status(200).json({
          message: "Title search completed successfully",
          search_information: {
              query: searchTitle,
              matches_found: searchResults.totalMatches,
              note: searchResults.totalMatches > 1 ? 
                    "Multiple matches found. Results are sorted with exact matches first." : 
                    "Single match found."
          },
          results: searchResults.books
      });

  } catch (error) {
      // Handle different types of errors appropriately
      if (error.message.includes('No books found')) {
          res.status(404).json({
              message: error.message,
              suggestions: [
                  "Try using fewer words",
                  "Check for typos",
                  "Use partial title"
              ]
          });
      } else {
          res.status(500).json({
              message: "Error occurred during title search",
              error: error.message
          });
      }
  }
});

// Get book review
public_users.get('/review/:isbn', function (req, res) {
  try {
      // Extract the ISBN from the URL parameter
      const isbn = req.params.isbn;
      
      // First, verify that the book exists in our database
      if (!books[isbn]) {
          return res.status(404).json({
              message: "Book not found with ISBN: " + isbn
          });
      }

      // Get the reviews for this specific book
      const bookReviews = books[isbn].reviews;

      // Check if the book has any reviews
      const reviewCount = Object.keys(bookReviews).length;
      
      if (reviewCount > 0) {
          // If we have reviews, return them along with some helpful metadata
          res.status(200).json({
              isbn: isbn,
              bookTitle: books[isbn].title,
              numberOfReviews: reviewCount,
              reviews: bookReviews
          });
      } else {
          // If no reviews exist, return an informative message
          res.status(200).json({
              isbn: isbn,
              bookTitle: books[isbn].title,
              message: "No reviews found for this book",
              reviews: {}
          });
      }

  } catch (error) {
      // Handle any unexpected errors
      res.status(500).json({
          message: "Error occurred while retrieving book reviews",
          error: error.message
      });
  }
});

module.exports.general = public_users;
