-- Creating the global_units table
CREATE TABLE global_units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    age INTEGER NOT NULL,
    stats JSONB NOT NULL,
    strengths TEXT[] NOT NULL,
    weaknesses TEXT[] NOT NULL,
    description TEXT NOT NULL
);

-- Creating the civilizations table
CREATE TABLE civilizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    flag TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    short_description TEXT NOT NULL,
    passive_bonuses TEXT[] NOT NULL,
    unique_units JSONB[] NOT NULL,
    technologies JSONB[] NOT NULL
);
