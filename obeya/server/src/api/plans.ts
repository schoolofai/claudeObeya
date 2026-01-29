import { existsSync, readFileSync } from 'fs';
import { getSessionByUuid, getPlansBySessionId, getPlanById, updatePlanContent, getPlansWithNullContent } from '../db';
import type { Plan } from '../types';

export function handlePlansRoutes(req: Request, url: URL): Response | null {
  const pathname = url.pathname;

  // GET /api/plans/:id/content - Get plan content by plan ID
  const planContentMatch = pathname.match(/^\/api\/plans\/(\d+)\/content$/);
  if (planContentMatch && req.method === 'GET') {
    const planId = parseInt(planContentMatch[1], 10);
    const plan = getPlanById(planId);

    if (!plan) {
      return Response.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Return DB content only - no disk fallback for remote compatibility
    if (!plan.plan_content) {
      return Response.json({
        error: 'Plan content not available. Plan was created before content capture was enabled.',
        plan: { ...plan, plan_content: null }
      }, { status: 200 }); // Return 200 with null content so UI can handle gracefully
    }

    return Response.json({ plan });
  }

  // GET /api/sessions/:uuid/plans - Get all plans for a session
  const plansMatch = pathname.match(/^\/api\/sessions\/([a-f0-9-]+)\/plans$/);
  if (plansMatch && req.method === 'GET') {
    const sessionUuid = plansMatch[1];
    const session = getSessionByUuid(sessionUuid);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    const plans = getPlansBySessionId(session.id);
    return Response.json({ plans });
  }

  // POST /api/plans/sync - Sync plans with NULL content from disk (one-time migration)
  // This endpoint reads plan files from disk and populates the database
  // Should only be used when server has local access to plan files
  if (pathname === '/api/plans/sync' && req.method === 'POST') {
    const plansToSync = getPlansWithNullContent();
    const results: { synced: number; failed: number; errors: string[] } = {
      synced: 0,
      failed: 0,
      errors: [],
    };

    for (const plan of plansToSync) {
      const expandedPath = plan.plan_path.replace(/^~/, process.env.HOME || '');
      if (existsSync(expandedPath)) {
        try {
          const content = readFileSync(expandedPath, 'utf-8');
          updatePlanContent(plan.id, content);
          results.synced++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Failed to read ${plan.plan_name}: ${err}`);
        }
      } else {
        results.failed++;
        results.errors.push(`File not found: ${plan.plan_path}`);
      }
    }

    return Response.json({
      message: `Sync complete: ${results.synced} synced, ${results.failed} failed`,
      ...results,
    });
  }

  return null;
}
