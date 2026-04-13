import type { Item, Priority } from '@shared/types';
import { and, eq } from 'drizzle-orm';

import type { FastifyInstance } from 'fastify';
import { RRule } from 'rrule';
import { db } from '../db/client';
import { itemsTable } from '../db/schema';

const priorityRank: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function parseExceptions(value: string) {
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter((entry): entry is number => typeof entry === 'number') : [];
	} catch {
		return [];
	}
}

function serializeExceptions(value: unknown) {
	if (Array.isArray(value)) {
		return JSON.stringify(value.filter((entry): entry is number => typeof entry === 'number'));
	}

	return '[]';
}

function toItem(row: typeof itemsTable.$inferSelect): Item {
	return {
		...row,
		notes: row.notes ?? null,
		startsAt: row.startsAt ?? null,
		endsAt: row.endsAt ?? null,
		rrule: row.rrule ?? null,
		completedAt: row.completedAt ?? null,
		exceptions: parseExceptions(row.exceptions),
	};
}

function normalizePriority(value: unknown): Priority {
	return value === 'low' || value === 'medium' || value === 'high' || value === 'critical' ? value : 'medium';
}

function normalizeNullableString(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeNullableNumber(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : null;
}

function sortItems(items: Item[]) {
	return [...items].sort((left, right) => {
		if (left.startsAt === null && right.startsAt === null) {
			return priorityRank[right.priority] - priorityRank[left.priority] || left.createdAt - right.createdAt;
		}

		if (left.startsAt === null) {
			return -1;
		}

		if (right.startsAt === null) {
			return 1;
		}

		return (
			left.startsAt - right.startsAt ||
			priorityRank[right.priority] - priorityRank[left.priority] ||
			left.createdAt - right.createdAt
		);
	});
}

export async function registerItemRoutes(app: FastifyInstance) {
	app.get('/items', async (request) => {
		const query = request.query as { includeCompleted?: string; day?: string };
		const includeCompleted = query.includeCompleted === '1';
		const day = typeof query.day === 'string' ? query.day : null;

		const rows = await db.select().from(itemsTable);
		let items = rows.map(toItem);

		if (!includeCompleted) {
			items = items.filter((item) => !item.completed);
		}

		if (day) {
			const start = new Date(`${day}T00:00:00`);
			const end = new Date(`${day}T23:59:59`);
			const startSeconds = Math.floor(start.getTime() / 1000);
			const endSeconds = Math.floor(end.getTime() / 1000);

			items = items.filter((item) => {
				if (item.startsAt === null) {
					return false;
				}

				return item.startsAt >= startSeconds && item.startsAt <= endSeconds;
			});
		}

		return { items: sortItems(items) };
	});

	app.post('/items', async (request, reply) => {
		const body = request.body as Record<string, unknown>;
		const title = typeof body.title === 'string' ? body.title.trim() : '';

		if (!title) {
			return reply.status(400).send({ error: 'Title is required.' });
		}

		const now = Math.floor(Date.now() / 1000);
		const item = {
			id: crypto.randomUUID(),
			title,
			notes: normalizeNullableString(body.notes),
			priority: normalizePriority(body.priority),
			startsAt: normalizeNullableNumber(body.startsAt),
			endsAt: normalizeNullableNumber(body.endsAt),
			isAllDay: Boolean(body.isAllDay),
			rrule: normalizeNullableString(body.rrule),
			exceptions: serializeExceptions(body.exceptions),
			completed: false,
			completedAt: null,
			createdAt: now,
			updatedAt: now,
		} as const;

		await db.insert(itemsTable).values(item);
		return reply.status(201).send({ item: toItem(item) });
	});

	app.patch('/items/:id', async (request, reply) => {
		const params = request.params as { id: string };
		const body = request.body as Record<string, unknown>;

		const existing = await db.query.itemsTable.findFirst({ where: eq(itemsTable.id, params.id) });

		if (!existing) {
			return reply.status(404).send({ error: 'Item not found.' });
		}

		const nextCompleted = typeof body.completed === 'boolean' ? body.completed : existing.completed;
		const nextTitle = typeof body.title === 'string' ? body.title.trim() : existing.title;
		if (!nextTitle) {
			return reply.status(400).send({ error: 'Title is required.' });
		}

		const update = {
			title: nextTitle,
			notes: body.notes === undefined ? existing.notes : normalizeNullableString(body.notes),
			priority: body.priority === undefined ? existing.priority : normalizePriority(body.priority),
			startsAt: body.startsAt === undefined ? existing.startsAt : normalizeNullableNumber(body.startsAt),
			endsAt: body.endsAt === undefined ? existing.endsAt : normalizeNullableNumber(body.endsAt),
			isAllDay: body.isAllDay === undefined ? existing.isAllDay : Boolean(body.isAllDay),
			rrule: body.rrule === undefined ? existing.rrule : normalizeNullableString(body.rrule),
			exceptions: body.exceptions === undefined ? existing.exceptions : serializeExceptions(body.exceptions),
			completed: nextCompleted,
			completedAt:
				body.completed === undefined ? existing.completedAt : nextCompleted ? Math.floor(Date.now() / 1000) : null,
			updatedAt: Math.floor(Date.now() / 1000),
		};

		await db.update(itemsTable).set(update).where(eq(itemsTable.id, params.id));

		const updated = await db.query.itemsTable.findFirst({ where: eq(itemsTable.id, params.id) });

		return { item: toItem(updated ?? { ...existing, ...update }) };
	});

	app.post('/items/:id/toggle-complete', async (request, reply) => {
		const params = request.params as { id: string };
		const body = request.body as { completed?: boolean };

		const existing = await db.query.itemsTable.findFirst({ where: eq(itemsTable.id, params.id) });

		if (!existing) {
			return reply.status(404).send({ error: 'Item not found.' });
		}

		const completed = Boolean(body.completed);
		const completedAt = completed ? Math.floor(Date.now() / 1000) : null;

		await db
			.update(itemsTable)
			.set({ completed, completedAt, updatedAt: Math.floor(Date.now() / 1000) })
			.where(eq(itemsTable.id, params.id));

		return { item: toItem({ ...existing, completed, completedAt, updatedAt: Math.floor(Date.now() / 1000) }) };
	});

	app.post('/items/:id/skip-next', async (request, reply) => {
		const params = request.params as { id: string };
		const body = request.body as { afterTs?: number };
		const existing = await db.query.itemsTable.findFirst({
			where: and(eq(itemsTable.id, params.id), eq(itemsTable.completed, false)),
		});

		if (!existing) {
			return reply.status(404).send({ error: 'Item not found.' });
		}

		if (!existing.rrule || !existing.startsAt) {
			return reply.status(400).send({ error: 'Recurring rule not configured.' });
		}

		const options = RRule.parseString(existing.rrule);
		const rule = new RRule({ ...options, dtstart: new Date(existing.startsAt * 1000) });

		const nextOccurrence = rule.after(
			new Date(((typeof body.afterTs === 'number' ? body.afterTs : Math.floor(Date.now() / 1000)) - 1) * 1000),
			false
		);

		if (!nextOccurrence) {
			return reply.status(400).send({ error: 'No future occurrence found.' });
		}

		const exceptions = Array.from(
			new Set([...parseExceptions(existing.exceptions), Math.floor(nextOccurrence.getTime() / 1000)])
		).sort((left, right) => left - right);

		await db
			.update(itemsTable)
			.set({ exceptions: JSON.stringify(exceptions), updatedAt: Math.floor(Date.now() / 1000) })
			.where(eq(itemsTable.id, params.id));

		return {
			item: toItem({ ...existing, exceptions: JSON.stringify(exceptions), updatedAt: Math.floor(Date.now() / 1000) }),
		};
	});

	app.delete('/items/:id', async (request, reply) => {
		const params = request.params as { id: string };
		await db.delete(itemsTable).where(eq(itemsTable.id, params.id));
		return reply.status(204).send();
	});
}
