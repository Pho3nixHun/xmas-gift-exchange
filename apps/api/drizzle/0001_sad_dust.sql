CREATE TABLE "assignment" (
	"season_id" uuid NOT NULL,
	"giver_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_season_id_giver_id_pk" PRIMARY KEY("season_id","giver_id"),
	CONSTRAINT "assignment_season_id_recipient_id_unique" UNIQUE("season_id","recipient_id"),
	CONSTRAINT "assignment_not_self" CHECK ("assignment"."giver_id" <> "assignment"."recipient_id")
);
--> statement-breakpoint
CREATE TABLE "wish_claim" (
	"wish_id" uuid PRIMARY KEY NOT NULL,
	"claimer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exclusion" (
	"giver_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	CONSTRAINT "exclusion_giver_id_recipient_id_pk" PRIMARY KEY("giver_id","recipient_id"),
	CONSTRAINT "exclusion_not_self" CHECK ("exclusion"."giver_id" <> "exclusion"."recipient_id")
);
--> statement-breakpoint
CREATE TABLE "participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"password_hash" text,
	"generation" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participant_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "mutation_receipt" (
	"actor" text NOT NULL,
	"season_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"key" uuid NOT NULL,
	"digest" text NOT NULL,
	"status" integer NOT NULL,
	"response" jsonb NOT NULL,
	CONSTRAINT "mutation_receipt_actor_season_id_operation_key_pk" PRIMARY KEY("actor","season_id","operation","key")
);
--> statement-breakpoint
CREATE TABLE "password_recovery" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"generation" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "password_recovery_participant_id_unique" UNIQUE("participant_id")
);
--> statement-breakpoint
CREATE TABLE "recovery_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"issuer" text NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"csrf" text NOT NULL,
	"role" text NOT NULL,
	"participant_id" uuid,
	"season_id" uuid,
	"generation" integer,
	"organiser_version" text,
	"reauthenticated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_role" CHECK (("session"."role" = 'participant' and "session"."participant_id" is not null and "session"."season_id" is not null and "session"."generation" is not null) or ("session"."role" = 'organiser' and "session"."participant_id" is null and "session"."organiser_version" is not null))
);
--> statement-breakpoint
CREATE TABLE "draw_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"giver_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"color" text NOT NULL,
	CONSTRAINT "draw_slot_season_id_giver_id_recipient_id_unique" UNIQUE("season_id","giver_id","recipient_id"),
	CONSTRAINT "draw_slot_season_id_giver_id_ordinal_unique" UNIQUE("season_id","giver_id","ordinal"),
	CONSTRAINT "draw_slot_id_season_id_giver_id_recipient_id_unique" UNIQUE("id","season_id","giver_id","recipient_id"),
	CONSTRAINT "slot_not_self" CHECK ("draw_slot"."giver_id" <> "draw_slot"."recipient_id"),
	CONSTRAINT "slot_color" CHECK ("draw_slot"."color" in ('red','purple','blue','gold'))
);
--> statement-breakpoint
CREATE TABLE "wish" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"description" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"priority" text NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wish_priority" CHECK ("wish"."priority" in ('low','medium','high')),
	CONSTRAINT "wish_description" CHECK (char_length("wish"."description") between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "season" ADD COLUMN "setup_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "season" ADD COLUMN "draw_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_giver_id_participant_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_recipient_id_participant_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_slot_id_season_id_giver_id_recipient_id_draw_slot_id_season_id_giver_id_recipient_id_fk" FOREIGN KEY ("slot_id","season_id","giver_id","recipient_id") REFERENCES "public"."draw_slot"("id","season_id","giver_id","recipient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_claim" ADD CONSTRAINT "wish_claim_wish_id_wish_id_fk" FOREIGN KEY ("wish_id") REFERENCES "public"."wish"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_claim" ADD CONSTRAINT "wish_claim_claimer_id_participant_id_fk" FOREIGN KEY ("claimer_id") REFERENCES "public"."participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusion" ADD CONSTRAINT "exclusion_giver_id_participant_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusion" ADD CONSTRAINT "exclusion_recipient_id_participant_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_recovery" ADD CONSTRAINT "password_recovery_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_recovery" ADD CONSTRAINT "password_recovery_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_audit" ADD CONSTRAINT "recovery_audit_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_audit" ADD CONSTRAINT "recovery_audit_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_slot" ADD CONSTRAINT "draw_slot_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_slot" ADD CONSTRAINT "draw_slot_giver_id_participant_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_slot" ADD CONSTRAINT "draw_slot_recipient_id_participant_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish" ADD CONSTRAINT "wish_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish" ADD CONSTRAINT "wish_owner_id_participant_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."participant"("id") ON DELETE no action ON UPDATE no action;