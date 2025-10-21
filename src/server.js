const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, initDB } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Initialize database
initDB();

// City to timezone mapping (common cities)
const cityTimezoneMap = {
  // North America
  'new york': 'America/New_York',
  'nyc': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'la': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'denver': 'America/Denver',
  'seattle': 'America/Los_Angeles',
  'boston': 'America/New_York',
  'san francisco': 'America/Los_Angeles',
  'miami': 'America/New_York',
  'toronto': 'America/Toronto',
  'vancouver': 'America/Vancouver',
  'mexico city': 'America/Mexico_City',

  // Europe
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'berlin': 'Europe/Berlin',
  'madrid': 'Europe/Madrid',
  'rome': 'Europe/Rome',
  'amsterdam': 'Europe/Amsterdam',
  'brussels': 'Europe/Brussels',
  'vienna': 'Europe/Vienna',
  'zurich': 'Europe/Zurich',
  'moscow': 'Europe/Moscow',
  'athens': 'Europe/Athens',
  'lisbon': 'Europe/Lisbon',
  'dublin': 'Europe/Dublin',

  // Asia
  'tokyo': 'Asia/Tokyo',
  'beijing': 'Asia/Shanghai',
  'shanghai': 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong',
  'singapore': 'Asia/Singapore',
  'seoul': 'Asia/Seoul',
  'bangkok': 'Asia/Bangkok',
  'dubai': 'Asia/Dubai',
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'bangalore': 'Asia/Kolkata',
  'jakarta': 'Asia/Jakarta',
  'manila': 'Asia/Manila',

  // Oceania
  'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne',
  'brisbane': 'Australia/Brisbane',
  'auckland': 'Pacific/Auckland',

  // South America
  'sao paulo': 'America/Sao_Paulo',
  'rio de janeiro': 'America/Sao_Paulo',
  'buenos aires': 'America/Argentina/Buenos_Aires',
  'santiago': 'America/Santiago',

  // Africa
  'cairo': 'Africa/Cairo',
  'johannesburg': 'Africa/Johannesburg',
  'lagos': 'Africa/Lagos',
  'nairobi': 'Africa/Nairobi'
};

// Helper function to get timezone from city
function getTimezoneFromCity(city) {
  if (!city) return null;

  const cityLower = city.toLowerCase().trim();

  // Direct match
  if (cityTimezoneMap[cityLower]) {
    return cityTimezoneMap[cityLower];
  }

  // Partial match
  for (const [key, timezone] of Object.entries(cityTimezoneMap)) {
    if (cityLower.includes(key) || key.includes(cityLower)) {
      return timezone;
    }
  }

  // Default to UTC if no match found
  return 'UTC';
}

// API Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Register a new user
app.post('/api/users', upload.single('photo'), async (req, res) => {
  try {
    const { name, date_of_birth, city } = req.body;

    if (!name || !date_of_birth || !city) {
      return res.status(400).json({ error: 'Name, date of birth, and city are required' });
    }

    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Get timezone from city
    const timezone = getTimezoneFromCity(city);
    console.log(`Detected timezone for ${city}: ${timezone}`);

    const result = await pool.query(
      'INSERT INTO users (name, date_of_birth, city, timezone, photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, date_of_birth, city, timezone, photo_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete a user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get user to delete their photo
    const userResult = await pool.query('SELECT photo_url FROM users WHERE id = $1', [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete photo file if it exists
    if (userResult.rows[0].photo_url) {
      const photoPath = path.join(__dirname, 'public', userResult.rows[0].photo_url);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
