CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_email` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `ticket_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`action` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_activity_ticket_created` ON `ticket_activity` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`project` text DEFAULT 'General' NOT NULL,
	`issue_type` text DEFAULT 'Task' NOT NULL,
	`status` text DEFAULT 'To Do' NOT NULL,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`reporter_id` text NOT NULL,
	`assignee_id` text,
	`assignee_name` text DEFAULT 'Unassigned' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`story_points` integer,
	`start_date` text,
	`due_date` text,
	`labels` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_ticket_key_unique` ON `tickets` (`ticket_key`);--> statement-breakpoint
CREATE INDEX `idx_tickets_status` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tickets_assignee` ON `tickets` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `idx_tickets_project_status` ON `tickets` (`project`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tickets_due_date` ON `tickets` (`due_date`);