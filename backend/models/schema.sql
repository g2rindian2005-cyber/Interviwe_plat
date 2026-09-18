-- DevOpsAI Platform Database Schema
-- Run: psql -U devopsai_user -d devopsai -f schema.sql

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en',  -- en | hi | mr
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    technology VARCHAR(50) NOT NULL,      -- AWS, Docker, Kubernetes, Terraform, Jenkins, Linux, GitHub Actions, Monitoring
    language VARCHAR(10) NOT NULL,        -- en | hi | mr
    difficulty VARCHAR(20) NOT NULL,      -- beginner | intermediate | advanced
    interview_type VARCHAR(20) DEFAULT 'voice', -- voice | text
    total_questions INTEGER DEFAULT 0,
    technical_score NUMERIC(5,2) DEFAULT 0,
    communication_score NUMERIC(5,2) DEFAULT 0,
    confidence_score NUMERIC(5,2) DEFAULT 0,
    overall_score NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress | completed
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_questions (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    ai_feedback TEXT,
    score NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    technology VARCHAR(50) NOT NULL,
    language VARCHAR(10) NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assistant_chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    technology VARCHAR(50) NOT NULL,
    topics_completed INTEGER DEFAULT 0,
    total_topics INTEGER DEFAULT 10,
    quizzes_taken INTEGER DEFAULT 0,
    interviews_taken INTEGER DEFAULT 0,
    avg_score NUMERIC(5,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, technology)
);

CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON learning_progress(user_id);
