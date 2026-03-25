
CREATE TABLE IF NOT EXISTS webrtc_signals (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    payload TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webrtc_receiver ON webrtc_signals(receiver_id, id);
