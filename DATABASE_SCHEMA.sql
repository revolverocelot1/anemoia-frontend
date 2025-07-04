-- Simple Authentication Database Schema
-- Can be used with PostgreSQL, MySQL, or SQLite

-- Users table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL for OAuth users
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  provider VARCHAR(20) CHECK (provider IN ('local', 'google', 'twitter', 'github')),
  email_verified BOOLEAN DEFAULT FALSE,
  anemo_id VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE password_resets (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE email_verifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth states (for security)
CREATE TABLE oauth_states (
  state VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  redirect_url TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Clean up expired sessions periodically
-- This can be run as a cron job or scheduled task
DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
DELETE FROM password_resets WHERE expires_at < CURRENT_TIMESTAMP;
DELETE FROM email_verifications WHERE expires_at < CURRENT_TIMESTAMP;
DELETE FROM oauth_states WHERE expires_at < CURRENT_TIMESTAMP; 