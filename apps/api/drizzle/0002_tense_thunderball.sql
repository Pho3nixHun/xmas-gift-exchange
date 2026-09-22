CREATE TABLE "preview_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"url_hash" text NOT NULL,
	"status" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"site" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "preview_cache_season_id_url_hash_unique" UNIQUE("season_id","url_hash")
);
--> statement-breakpoint
ALTER TABLE "preview_cache" ADD CONSTRAINT "preview_cache_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;