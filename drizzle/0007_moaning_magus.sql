CREATE TABLE "search_queries" (
	"term" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"results" integer DEFAULT 0 NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL
);
