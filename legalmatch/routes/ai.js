import express from 'express';
import { LLM_PROVIDER } from '../services/aiAssist.js';
import { AREA_TO_CATEGORY } from '../services/aiMatchingClient.js';
import { runAssistantTurn, buildDraftFromFacts, CASE_FACT_SLOTS } from '../services/assistantEngine.js';

const router = express.Router();

// GET: which provider is live, so the frontend knows whether to show a
// real AI badge or a neutral "Draft" label (brief section B6).
router.get('/status', (_req, res) => {
  res.json({ provider: LLM_PROVIDER });
});

// POST: one turn of the adaptive AI Assistant chat (Deliverable 4,
// section 5 - replaces the old fixed four-question script). The client
// carries conversation state (facts/askedSlots/turnsAsked/lastAskedSlot)
// across turns and sends it back each time, same stateless-server pattern
// as the rest of this app (no session/conversation store exists).
router.post('/assistant-turn', async (req, res) => {
  const { state, message } = req.body || {};

  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required.' });
  }

  try {
    const turn = await runAssistantTurn(state || {}, message);

    if (!turn.readyToDraft) {
      return res.json({
        reply: turn.reply,
        state: {
          facts: turn.facts,
          askedSlots: turn.askedSlots,
          turnsAsked: turn.turnsAsked,
          lastAskedSlot: turn.lastAskedSlot,
          bankArea: turn.bankArea,
        },
        readyToDraft: false,
      });
    }

    const draft = buildDraftFromFacts(turn.facts);
    return res.json({
      reply: turn.reply,
      state: { facts: turn.facts, askedSlots: turn.askedSlots, turnsAsked: turn.turnsAsked, bankArea: turn.bankArea },
      readyToDraft: true,
      draft: {
        ...draft,
        category: draft.matchedArea ? AREA_TO_CATEGORY[draft.matchedArea] || null : null,
      },
    });
  } catch (err) {
    console.error('Error running assistant turn:', err.message);
    return res.status(500).json({ error: 'Server error while continuing the conversation.' });
  }
});

// GET: the case_facts slot names, for any client that wants to render
// them generically rather than hardcoding the list.
router.get('/assistant-slots', (_req, res) => {
  res.json({ slots: CASE_FACT_SLOTS });
});

export default router;
