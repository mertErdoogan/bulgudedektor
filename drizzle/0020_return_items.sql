ALTER TABLE "return_requests" ADD COLUMN "items" jsonb DEFAULT '[]'::jsonb NOT NULL;
