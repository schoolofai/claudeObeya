import { getDashboardOverview } from '../db';

export function handleDashboardRoutes(req: Request, url: URL): Response | null {
  const pathname = url.pathname;

  if (pathname === '/api/dashboard/overview' && req.method === 'GET') {
    const overview = getDashboardOverview();
    return Response.json(overview);
  }

  return null;
}
