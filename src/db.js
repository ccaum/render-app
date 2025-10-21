const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Function to read db.secrets file
function readDbSecrets() {
  const secretsPath = path.join(__dirname, 'db.secrets');

  if (!fs.existsSync(secretsPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(secretsPath, 'utf8');
    const secrets = {};

    content.split('\n').forEach(line => {
      line = line.trim();
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;

      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        secrets[key.trim()] = valueParts.join('=').trim();
      }
    });

    return secrets;
  } catch (err) {
    console.error('Error reading db.secrets file:', err);
    return null;
  }
}

// Build database configuration
function getDatabaseConfig() {
  const secrets = readDbSecrets();
  const dbHost = process.env.DB_HOST;

  // Priority 1: Use db.secrets file + DB_HOST env variable
  if (secrets && dbHost) {
    console.log('Using database credentials from db.secrets file with DB_HOST environment variable');
    return {
      host: dbHost,
      user: secrets.DB_USER || 'postgres',
      password: secrets.DB_PASSWORD,
      database: secrets.DB_NAME || 'christmas_countdown',
      port: secrets.DB_PORT || 5432,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  // Priority 2: Use db.secrets file with default host
  if (secrets) {
    console.log('Using database credentials from db.secrets file with default host');
    return {
      host: 'localhost',
      user: secrets.DB_USER || 'postgres',
      password: secrets.DB_PASSWORD,
      database: secrets.DB_NAME || 'christmas_countdown',
      port: secrets.DB_PORT || 5432,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  // Priority 3: Use DATABASE_URL environment variable
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL environment variable');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  // Priority 4: Default to Docker Compose database
  console.log('Using default Docker Compose database configuration');
  return {
    host: 'db',
    user: 'postgres',
    password: 'christmas2024',
    database: 'christmas_countdown',
    port: 5432,
    ssl: false
  };
}

const pool = new Pool(getDatabaseConfig());

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date_of_birth DATE NOT NULL,
        city VARCHAR(255) NOT NULL,
        timezone VARCHAR(100),
        photo_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add timezone column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='timezone'
        ) THEN
          ALTER TABLE users ADD COLUMN timezone VARCHAR(100);
        END IF;
      END $$;
    `);

    // Add latitude and longitude columns if they don't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='latitude'
        ) THEN
          ALTER TABLE users ADD COLUMN latitude NUMERIC(10, 6);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='longitude'
        ) THEN
          ALTER TABLE users ADD COLUMN longitude NUMERIC(10, 6);
        END IF;
      END $$;
    `);

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
