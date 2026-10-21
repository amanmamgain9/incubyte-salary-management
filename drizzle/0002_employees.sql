CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"department_id" text NOT NULL,
	"work_country_code" text NOT NULL,
	"joining_date" date NOT NULL,
	"last_working_day" date,
	"annual_base_pay" numeric(18, 2) NOT NULL,
	"salary_currency_code" text NOT NULL,
	"salary_revision" integer NOT NULL,
	CONSTRAINT "employees_annual_base_pay_positive" CHECK ("employees"."annual_base_pay" > 0 and "employees"."annual_base_pay" <> 'NaN'),
	CONSTRAINT "employees_salary_revision_positive" CHECK ("employees"."salary_revision" > 0),
	CONSTRAINT "employees_last_working_day_after_joining" CHECK ("employees"."last_working_day" is null or "employees"."last_working_day" >= "employees"."joining_date")
);
--> statement-breakpoint
CREATE TABLE "salary_history" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"employee_id" text NOT NULL,
	"revision" integer NOT NULL,
	"annual_base_pay" numeric(18, 2) NOT NULL,
	"currency_code" text NOT NULL,
	"work_country_code_at_change" text NOT NULL,
	"department_id_at_change" text NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "salary_history_employee_id_revision_unique" UNIQUE("employee_id","revision"),
	CONSTRAINT "salary_history_annual_base_pay_positive" CHECK ("salary_history"."annual_base_pay" > 0 and "salary_history"."annual_base_pay" <> 'NaN'),
	CONSTRAINT "salary_history_revision_positive" CHECK ("salary_history"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_work_country_code_countries_code_fk" FOREIGN KEY ("work_country_code") REFERENCES "public"."countries"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_salary_currency_code_currencies_code_fk" FOREIGN KEY ("salary_currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_work_country_code_at_change_countries_code_fk" FOREIGN KEY ("work_country_code_at_change") REFERENCES "public"."countries"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_department_id_at_change_departments_id_fk" FOREIGN KEY ("department_id_at_change") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_work_country_code_id_idx" ON "employees" USING btree ("work_country_code","id");--> statement-breakpoint
CREATE INDEX "employees_department_id_id_idx" ON "employees" USING btree ("department_id","id");--> statement-breakpoint
CREATE INDEX "salary_history_changed_at_employee_id_idx" ON "salary_history" USING btree ("changed_at","employee_id");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "employees" TO acme_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "salary_history" TO acme_app;
