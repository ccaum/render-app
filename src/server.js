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

// City data with timezone and coordinates
const cityData = {
  // North America
  'new york': { timezone: 'America/New_York', lat: 40.7128, lon: -74.0060 },
  'nyc': { timezone: 'America/New_York', lat: 40.7128, lon: -74.0060 },
  'los angeles': { timezone: 'America/Los_Angeles', lat: 34.0522, lon: -118.2437 },
  'la': { timezone: 'America/Los_Angeles', lat: 34.0522, lon: -118.2437 },
  'chicago': { timezone: 'America/Chicago', lat: 41.8781, lon: -87.6298 },
  'denver': { timezone: 'America/Denver', lat: 39.7392, lon: -104.9903 },
  'seattle': { timezone: 'America/Los_Angeles', lat: 47.6062, lon: -122.3321 },
  'boston': { timezone: 'America/New_York', lat: 42.3601, lon: -71.0589 },
  'san francisco': { timezone: 'America/Los_Angeles', lat: 37.7749, lon: -122.4194 },
  'miami': { timezone: 'America/New_York', lat: 25.7617, lon: -80.1918 },
  'toronto': { timezone: 'America/Toronto', lat: 43.6532, lon: -79.3832 },
  'vancouver': { timezone: 'America/Vancouver', lat: 49.2827, lon: -123.1207 },
  'mexico city': { timezone: 'America/Mexico_City', lat: 19.4326, lon: -99.1332 },

  // Europe
  'london': { timezone: 'Europe/London', lat: 51.5074, lon: -0.1278 },
  'paris': { timezone: 'Europe/Paris', lat: 48.8566, lon: 2.3522 },
  'berlin': { timezone: 'Europe/Berlin', lat: 52.5200, lon: 13.4050 },
  'madrid': { timezone: 'Europe/Madrid', lat: 40.4168, lon: -3.7038 },
  'rome': { timezone: 'Europe/Rome', lat: 41.9028, lon: 12.4964 },
  'amsterdam': { timezone: 'Europe/Amsterdam', lat: 52.3676, lon: 4.9041 },
  'brussels': { timezone: 'Europe/Brussels', lat: 50.8503, lon: 4.3517 },
  'vienna': { timezone: 'Europe/Vienna', lat: 48.2082, lon: 16.3738 },
  'zurich': { timezone: 'Europe/Zurich', lat: 47.3769, lon: 8.5417 },
  'moscow': { timezone: 'Europe/Moscow', lat: 55.7558, lon: 37.6173 },
  'athens': { timezone: 'Europe/Athens', lat: 37.9838, lon: 23.7275 },
  'lisbon': { timezone: 'Europe/Lisbon', lat: 38.7223, lon: -9.1393 },
  'dublin': { timezone: 'Europe/Dublin', lat: 53.3498, lon: -6.2603 },

  // Asia
  'tokyo': { timezone: 'Asia/Tokyo', lat: 35.6762, lon: 139.6503 },
  'beijing': { timezone: 'Asia/Shanghai', lat: 39.9042, lon: 116.4074 },
  'shanghai': { timezone: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737 },
  'hong kong': { timezone: 'Asia/Hong_Kong', lat: 22.3193, lon: 114.1694 },
  'singapore': { timezone: 'Asia/Singapore', lat: 1.3521, lon: 103.8198 },
  'seoul': { timezone: 'Asia/Seoul', lat: 37.5665, lon: 126.9780 },
  'bangkok': { timezone: 'Asia/Bangkok', lat: 13.7563, lon: 100.5018 },
  'dubai': { timezone: 'Asia/Dubai', lat: 25.2048, lon: 55.2708 },
  'mumbai': { timezone: 'Asia/Kolkata', lat: 19.0760, lon: 72.8777 },
  'delhi': { timezone: 'Asia/Kolkata', lat: 28.7041, lon: 77.1025 },
  'bangalore': { timezone: 'Asia/Kolkata', lat: 12.9716, lon: 77.5946 },
  'jakarta': { timezone: 'Asia/Jakarta', lat: -6.2088, lon: 106.8456 },
  'manila': { timezone: 'Asia/Manila', lat: 14.5995, lon: 120.9842 },

  // Oceania
  'sydney': { timezone: 'Australia/Sydney', lat: -33.8688, lon: 151.2093 },
  'melbourne': { timezone: 'Australia/Melbourne', lat: -37.8136, lon: 144.9631 },
  'brisbane': { timezone: 'Australia/Brisbane', lat: -27.4698, lon: 153.0251 },
  'auckland': { timezone: 'Pacific/Auckland', lat: -36.8485, lon: 174.7633 },

  // South America
  'sao paulo': { timezone: 'America/Sao_Paulo', lat: -23.5505, lon: -46.6333 },
  'rio de janeiro': { timezone: 'America/Sao_Paulo', lat: -22.9068, lon: -43.1729 },
  'buenos aires': { timezone: 'America/Argentina/Buenos_Aires', lat: -34.6037, lon: -58.3816 },
  'santiago': { timezone: 'America/Santiago', lat: -33.4489, lon: -70.6693 },

  // Africa
  'cairo': { timezone: 'Africa/Cairo', lat: 30.0444, lon: 31.2357 },
  'johannesburg': { timezone: 'Africa/Johannesburg', lat: -26.2041, lon: 28.0473 },
  'lagos': { timezone: 'Africa/Lagos', lat: 6.5244, lon: 3.3792 },
  'nairobi': { timezone: 'Africa/Nairobi', lat: -1.2864, lon: 36.8172 }
};

// Helper function to get city data (timezone and coordinates)
function getCityData(city) {
  if (!city) return { timezone: null, lat: null, lon: null };

  const cityLower = city.toLowerCase().trim();

  // Direct match
  if (cityData[cityLower]) {
    return cityData[cityLower];
  }

  // Partial match
  for (const [key, data] of Object.entries(cityData)) {
    if (cityLower.includes(key) || key.includes(cityLower)) {
      return data;
    }
  }

  // Default to UTC with no coordinates
  return { timezone: 'UTC', lat: null, lon: null };
}

// Helper function to get just timezone (for backward compatibility)
function getTimezoneFromCity(city) {
  return getCityData(city).timezone;
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

    // Get city data (timezone and coordinates)
    const cityInfo = getCityData(city);
    console.log(`Detected data for ${city}:`, cityInfo);

    const result = await pool.query(
      'INSERT INTO users (name, date_of_birth, city, timezone, latitude, longitude, photo_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, date_of_birth, city, cityInfo.timezone, cityInfo.lat, cityInfo.lon, photo_url]
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
