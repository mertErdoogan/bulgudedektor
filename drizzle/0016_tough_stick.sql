CREATE TABLE "not_found_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"referrer" text,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "not_found_logs_path_unique" UNIQUE("path")
);
