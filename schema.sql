-- Esquema de Base de Datos D1 para Tracker de Unidades

DROP TABLE IF EXISTS characters;

CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    rarity INTEGER NOT NULL,
    awaken_level INTEGER NOT NULL,
    element TEXT NOT NULL,
    storage TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_characters_name ON characters(name);
