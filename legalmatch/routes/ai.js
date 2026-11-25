import express from 'express';
import { draftCaseFromAnswers, LLM_PROVIDER } from '../services/aiAssist.js';
import { suggestCategoryFromText } from '../services/aiMatchingClient.js';

const router = express.Router();

// GET: which provider is live, so the frontend knows whether to show a
// real AI badge or a neutral "Draft" label (brief section B6).
router.get('/status', (_req, res) => {
  res.json({ provider: LLM_PROVIDER });
});

// POST: AI Assistant chat intake -> draft case fields. The free-text
// answer is also sent to the AI service's real semantic engine for a
// category suggestion; everything else here is templated, not generated.
router.post('/draft-case', async (req, res) => {
  const { answers } = req.body || {};

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'answers object is required.' });
  }

  try {
    const draft = draftCaseFromAnswers(answers);
    const { category, area } = await suggestCategoryFromText(answers.whatHappened || '');

    return res.json({
      ...draft,
      category,
      categorySource: category ? 'ai-engine' : null,
      matchedArea: area,
    });
  } catch (err) {
    console.error('Error drafting case from assistant answers:', err.message);
    return res.status(500).json({ error: 'Server error while drafting your case.' });
  }
});

export default router;
