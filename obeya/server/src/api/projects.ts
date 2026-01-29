import { getAllProjects, getProjectsWithStats, getProjectById, getProjectByIdWithStats, getSessionsByProjectId, getRecentSessionsForProject } from '../db';

export function handleProjectsRoutes(req: Request, url: URL): Response | null {
  const pathname = url.pathname;

  if (pathname === '/api/projects' && req.method === 'GET') {
    const withStats = url.searchParams.get('stats') === 'true';
    const projects = withStats ? getProjectsWithStats() : getAllProjects();
    return Response.json({ projects });
  }

  const projectMatch = pathname.match(/^\/api\/projects\/(\d+)$/);
  if (projectMatch && req.method === 'GET') {
    const projectId = parseInt(projectMatch[1], 10);
    const withStats = url.searchParams.get('stats') === 'true';
    const project = withStats
      ? getProjectByIdWithStats(projectId)
      : getProjectById(projectId);
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    return Response.json({ project });
  }

  const sessionsMatch = pathname.match(/^\/api\/projects\/(\d+)\/sessions$/);
  if (sessionsMatch && req.method === 'GET') {
    const projectId = parseInt(sessionsMatch[1], 10);
    const project = getProjectById(projectId);
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    const sessions = getSessionsByProjectId(projectId);
    return Response.json({ sessions });
  }

  const recentMatch = pathname.match(/^\/api\/projects\/(\d+)\/sessions\/recent$/);
  if (recentMatch && req.method === 'GET') {
    const projectId = parseInt(recentMatch[1], 10);
    const limit = parseInt(url.searchParams.get('limit') || '3', 10);
    const sessions = getRecentSessionsForProject(projectId, limit);
    return Response.json({ sessions });
  }

  return null;
}
