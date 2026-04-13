import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const itemsTable = sqliteTable('items', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	notes: text('notes'),
	priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] })
		.notNull()
		.default('medium'),
	startsAt: integer('starts_at', { mode: 'number' }),
	endsAt: integer('ends_at', { mode: 'number' }),
	isAllDay: integer('is_all_day', { mode: 'boolean' }).notNull().default(false),
	rrule: text('rrule'),
	exceptions: text('exceptions').notNull().default('[]'),
	completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
	completedAt: integer('completed_at', { mode: 'number' }),
	createdAt: integer('created_at', { mode: 'number' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

export const configTable = sqliteTable('config', { key: text('key').primaryKey(), value: text('value').notNull() });

export type ItemRow = typeof itemsTable.$inferSelect;
export type NewItemRow = typeof itemsTable.$inferInsert;
export type ConfigRow = typeof configTable.$inferSelect;
