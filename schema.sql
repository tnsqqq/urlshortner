CREATE TABLE IF NOT EXISTS short_urls (
  short_id text PRIMARY KEY,
  redirect_url text NOT NULL,
  click_count integer NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS url_visits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  short_id text NOT NULL REFERENCES short_urls (short_id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS url_visits_short_id_visited_at_idx
  ON url_visits (short_id, visited_at);
