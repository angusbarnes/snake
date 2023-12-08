const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.static("site"));
app.use(bodyParser.json());

// Create a new SQLite database (data.db) if it doesn't exist
const db = new sqlite3.Database("data.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to the SQLite database.");

    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);

    // Create high_scores table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS high_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      score INTEGER,
      FOREIGN KEY (username) REFERENCES users(username)
    )`);

    // Create player_stats table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS player_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      play_count INTEGER,
      total_score INTEGER,
      FOREIGN KEY (username) REFERENCES users(username)
    )`);
}
});

// Register endpoint
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if the username already exists
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Insert the new user into the users table
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to register user" });
      }
      res.status(201).json({ message: "User registered successfully" });
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user by username
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Compare passwords
    const passwordMatch = password === user.password;
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ username }, "secret_key");

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Save high score endpoint
// Save high score endpoint with JWT token verification
app.post("/highscore", async (req, res) => {
  try {
    const { username, score, token } = req.body;

    // Verify the JWT token
    jwt.verify(token, "secret_key", async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if the decoded username matches the username in the request body
      if (decoded.username !== username) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the top 3 high scores for the user
      const userScores = await getUserScores(username);

      // Check the number of existing scores and sort them
      const allScores = [...userScores, score].sort((a, b) => b - a);
      const top3Scores = allScores.slice(0, 3); // Keep only the top 3 scores

      // Clear existing scores for the user
      await clearUserScores(username);

      // Insert the top 3 scores into the database
      top3Scores.forEach(async (userScore) => {
        await insertScore(username, userScore);
      });

      await updatePlayerStats(username, score)
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Function to get the top 3 high scores for a user
function getUserScores(username) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT score FROM high_scores WHERE username = ? ORDER BY score DESC LIMIT 3",
      [username],
      (err, rows) => {
        if (err) {
          reject(err);
        }
        const scores = rows.map((row) => row.score);
        resolve(scores);
      }
    );
  });
}

// Function to clear existing scores for a user
function clearUserScores(username) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM high_scores WHERE username = ?", [username], (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

// Function to insert a score for a user
// Function to insert a score for a user and update player stats
function insertScore(username, score) {
  console.log("New score added")
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO high_scores (username, score) VALUES (?, ?)',
      [username, score]
    );
  });
}

// Function to update player stats
function updatePlayerStats(username, score) {
  console.log("player stats updated")
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM player_stats WHERE username = ?',
      [username],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // User exists, update play_count and total_score
          db.run(
            'UPDATE player_stats SET play_count = play_count + 1, total_score = total_score + ? WHERE username = ?',
            [score, username],
            (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            }
          );
        } else {
          // User does not exist, insert a new record
          db.run(
            'INSERT INTO player_stats (username, play_count, total_score) VALUES (?, 1, ?)',
            [username, score],
            (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            }
          );
        }
      }
    );
  });
}

// Get high scores endpoint
app.get("/highscores", async (req, res) => {
  try {
    // Get top 10 high scores
    db.all("SELECT * FROM high_scores ORDER BY score DESC LIMIT 15", [], (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Failed to get high scores" });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Function to find user by username
function findUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
      if (err) {
        reject(err);
      }
      resolve(row);
    });
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
