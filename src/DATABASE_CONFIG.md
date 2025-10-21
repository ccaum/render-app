# Database Configuration

This application supports multiple methods for configuring the PostgreSQL database connection. The system will use the first available configuration method in the following priority order:

## Configuration Priority

### 1. **db.secrets file + DB_HOST environment variable** (Highest Priority)
Use this method when you have a remote database or custom database host.

**Setup:**
1. Copy `db.secrets.example` to `db.secrets`:
   ```bash
   cp db.secrets.example db.secrets
   ```

2. Edit `db.secrets` with your credentials:
   ```
   DB_USER=postgres
   DB_PASSWORD=your_secure_password
   DB_NAME=christmas_countdown
   DB_PORT=5432
   ```

3. Set the `DB_HOST` environment variable:
   ```bash
   export DB_HOST=your-database-host.com
   # or add to .env file:
   DB_HOST=your-database-host.com
   ```

4. Restart the application

**Example Use Cases:**
- Connecting to AWS RDS, Google Cloud SQL, or Azure Database
- Connecting to a remote PostgreSQL server
- Development environment with a custom database server

---

### 2. **db.secrets file only**
Use this method for local development with a custom database on localhost.

**Setup:**
1. Copy and edit `db.secrets` as shown above
2. Do NOT set `DB_HOST` environment variable
3. The app will connect to `localhost:5432` with your credentials

**Example Use Cases:**
- Local PostgreSQL installation
- Development with custom credentials

---

### 3. **DATABASE_URL environment variable**
Use this method for compatibility with Heroku, Render, and other PaaS platforms.

**Setup:**
1. Set the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL=postgresql://user:password@host:5432/database
   # or add to .env file:
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

**Example Use Cases:**
- Heroku deployments
- Render deployments
- Any platform that provides DATABASE_URL

---

### 4. **Docker Compose Default** (Lowest Priority)
This is the default fallback when no other configuration is found.

**Configuration:**
- Host: `db` (Docker Compose service name)
- User: `postgres`
- Password: `christmas2024`
- Database: `christmas_countdown`
- Port: `5432`

**Example Use Cases:**
- Running with `docker-compose up`
- Local development without custom configuration
- Quick start and testing

---

## Security Notes

⚠️ **Important:**
- The `db.secrets` file is automatically excluded from Git via `.gitignore`
- Never commit `db.secrets` to version control
- Use `db.secrets.example` as a template for team members
- Rotate passwords regularly in production environments

## Testing Your Configuration

After setting up your database configuration, check the application logs to see which method is being used:

```bash
docker-compose logs app | grep "Using"
```

You should see one of these messages:
- `Using database credentials from db.secrets file with DB_HOST environment variable`
- `Using database credentials from db.secrets file with default host`
- `Using DATABASE_URL environment variable`
- `Using default Docker Compose database configuration`

## Troubleshooting

**Connection fails with db.secrets:**
- Verify file format (key=value pairs)
- Check that DB_HOST is reachable
- Ensure PostgreSQL is running and accepting connections
- Verify credentials are correct

**"relation does not exist" errors:**
- The database will auto-create tables on first connection
- Check that DB_NAME exists in PostgreSQL
- Verify user has CREATE privileges on the database
