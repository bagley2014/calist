import type { FastifyReply, FastifyRequest } from 'fastify';

import bcrypt from 'bcryptjs';
import { configTable } from './db/schema';
import { db } from './db/client';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const FAILED_LOGIN_DELAY_MS = 10_000;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const AUTH_COOKIE = 'calist_session';

declare module 'fastify' {
	interface FastifyRequest {
		auth?: { subject: string };
	}
}

export async function hashPassword(password: string) {
	return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
	return bcrypt.compare(password, passwordHash);
}

export async function delayFailedLogin() {
	await Bun.sleep(FAILED_LOGIN_DELAY_MS);
}

export async function getConfigValue(key: string) {
	const row = await db.query.configTable.findFirst({ where: eq(configTable.key, key) });

	return row?.value ?? null;
}

export async function getRequiredConfigValue(key: string) {
	const value = await getConfigValue(key);

	if (!value) {
		throw new Error(`Missing config value: ${key}`);
	}

	return value;
}

export async function setConfigValue(key: string, value: string) {
	await db.insert(configTable).values({ key, value }).onConflictDoUpdate({ target: configTable.key, set: { value } });
}

export async function isSetupComplete() {
	return Boolean(await getConfigValue('passwordHash'));
}

export function generateConfigSecret() {
	return `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
}

export function generateApiKey() {
	return crypto.randomUUID().replaceAll('-', '');
}

export async function issueSession(reply: FastifyReply) {
	const sessionSecret = await getRequiredConfigValue('sessionSecret');
	const token = jwt.sign({ sub: 'calist-user' }, sessionSecret, { expiresIn: '30d' });

	const hostHeader = (reply.request?.headers?.host as string | undefined) ?? undefined;
	const domain = hostHeader ? hostHeader.split(':')[0] : undefined;

	reply.setCookie(AUTH_COOKIE, token, {
		httpOnly: true,
		sameSite: 'strict',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: SESSION_MAX_AGE_SECONDS,
		domain,
	});
}

export function clearSession(reply: FastifyReply) {
	reply.clearCookie(AUTH_COOKIE, {
		httpOnly: true,
		sameSite: 'strict',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
	});
}

export async function authenticateRequest(request: FastifyRequest, reply: FastifyReply) {
	const token = request.cookies[AUTH_COOKIE];

	if (!token) {
		return reply.status(401).send({ error: 'Not authenticated.' });
	}

	const sessionSecret = await getConfigValue('sessionSecret');
	if (!sessionSecret) {
		return reply.status(401).send({ error: 'Session secret not configured.' });
	}

	try {
		const payload = jwt.verify(token, sessionSecret) as jwt.JwtPayload;
		request.auth = { subject: String(payload.sub ?? 'calist-user') };
	} catch {
		return reply.status(401).send({ error: 'Invalid session.' });
	}
}
