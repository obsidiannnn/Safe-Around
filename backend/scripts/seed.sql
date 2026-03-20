-- =============================================================================
-- SafeAround Seed Data
-- =============================================================================
-- Run AFTER schema.sql:  psql $DATABASE_URL -f seed.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Crime categories (8 canonical categories)
-- ---------------------------------------------------------------------------
INSERT INTO crime_categories (id, category_name, category_code, default_severity, icon_name, color_hex)
VALUES
    (gen_random_uuid(), 'Theft',         'THF', 2, 'theft',    '#FFC107'),
    (gen_random_uuid(), 'Assault',       'AST', 4, 'assault',  '#F44336'),
    (gen_random_uuid(), 'Vandalism',     'VDL', 1, 'vandalism','#9E9E9E'),
    (gen_random_uuid(), 'Robbery',       'ROB', 3, 'robbery',  '#FF9800'),
    (gen_random_uuid(), 'Burglary',      'BRG', 3, 'burglary', '#FF5722'),
    (gen_random_uuid(), 'Vehicle Crime', 'VEH', 2, 'vehicle',  '#3F51B5'),
    (gen_random_uuid(), 'Drug Related',  'DRG', 2, 'drug',     '#9C27B0'),
    (gen_random_uuid(), 'Weapon',        'WPN', 4, 'weapon',   '#D32F2F')
ON CONFLICT (category_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Default crime sources
-- ---------------------------------------------------------------------------
INSERT INTO crime_sources (id, source_name, source_type, reliability_score, is_active)
VALUES
    (gen_random_uuid(), 'Police.uk Open Data API',  'api',     95, true),
    (gen_random_uuid(), 'User Community Reports',   'user_report', 70, true),
    (gen_random_uuid(), 'Local News Scraper',       'scraper', 60, true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Verify seeded rows
-- ---------------------------------------------------------------------------
SELECT category_code, category_name, default_severity FROM crime_categories ORDER BY default_severity DESC;
SELECT source_name, source_type, reliability_score FROM crime_sources;
