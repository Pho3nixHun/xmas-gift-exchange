CREATE TABLE "season" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton" boolean DEFAULT true NOT NULL,
	"status" varchar(8) DEFAULT 'setup' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_singleton_unique" UNIQUE("singleton"),
	CONSTRAINT "one_current_season" CHECK ("season"."singleton" = true),
	CONSTRAINT "season_status" CHECK ("season"."status" in ('setup', 'open'))
);
