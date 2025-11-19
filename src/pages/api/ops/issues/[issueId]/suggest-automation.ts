import { generateAutomationSuggestion } from '@/server/ops/suggestions/generateAutomationSuggestion';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const issueId = Array.isArray(req.query?.issueId) ? req.query.issueId[0] : req.query?.issueId;
  const orgId = req.body?.orgId;

  if (!issueId || typeof issueId !== 'string') {
    res.status(400).json({ error: 'Missing issueId' });
    return;
  }

  if (!orgId || typeof orgId !== 'string') {
    res.status(400).json({ error: 'Missing orgId' });
    return;
  }

  try {
    const result = await generateAutomationSuggestion({ issueId, orgId });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Automation failed' });
  }
}
