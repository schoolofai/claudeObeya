import { getSessionByUuid, getPlansBySessionId, getTasksBySessionId } from '../db';
import type { SessionWithDetails } from '../types';

export function handleSessionsRoutes(req: Request, url: URL): Response | null {
  const pathname = url.pathname;

  const sessionMatch = pathname.match(/^\/api\/sessions\/([a-zA-Z0-9-]+)$/);
  if (sessionMatch && req.method === 'GET') {
    const sessionUuid = sessionMatch[1];
    const session = getSessionByUuid(sessionUuid);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const withDetails = url.searchParams.get('details') === 'true';
    if (withDetails) {
      const plans = getPlansBySessionId(session.id);
      const tasks = getTasksBySessionId(session.id);
      const sessionWithDetails: SessionWithDetails = { ...session, plans, tasks };
      return Response.json({ session: sessionWithDetails });
    }

    return Response.json({ session });
  }

  return null;
}
