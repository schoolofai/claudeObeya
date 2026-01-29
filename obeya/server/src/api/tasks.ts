import { getSessionByUuid, getTasksBySessionId } from '../db';

export function handleTasksRoutes(req: Request, url: URL): Response | null {
  const pathname = url.pathname;

  const tasksMatch = pathname.match(/^\/api\/sessions\/([a-f0-9-]+)\/tasks$/);
  if (tasksMatch && req.method === 'GET') {
    const sessionUuid = tasksMatch[1];
    const session = getSessionByUuid(sessionUuid);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    const tasks = getTasksBySessionId(session.id);
    return Response.json({ tasks });
  }

  return null;
}
