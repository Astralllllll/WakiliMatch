# AI service evaluation results

Model: `sentence-transformers/all-MiniLM-L6-v2` | Index: 737 documents, 8,595 passages | Threshold: 0.328

## Retrieval metrics (35 labelled queries, notebook 3.4)

| Metric | Score |
|---|---|
| P@5 | 0.371 |
| P@10 | 0.406 |
| MRR | 0.466 |
| nDCG@10 | 0.389 |
| Random baseline P@5 | 0.109 |
| Lift at P@5 | 3.4x |

### Per-area P@5 / MRR

| area                            |   P@5 |   MRR |
|:--------------------------------|------:|------:|
| Commercial & Contract           |  0    | 0     |
| Constitutional & Administrative |  0.08 | 0.185 |
| Tax                             |  0.16 | 0.307 |
| Employment & Labour             |  0.4  | 0.653 |
| Land & Property                 |  0.6  | 0.55  |
| Family & Succession             |  0.6  | 0.567 |
| Criminal                        |  0.76 | 1     |

## Grouped 5-fold cross-validation with regularisation curve (notebook 3.5)

Areas evaluated: ['Constitutional & Administrative', 'Criminal', 'Employment & Labour', 'Family & Succession', 'Land & Property', 'Tax'] | folds: 5

| C | train macro-F1 | CV macro-F1 | CV std |
|---|---|---|---|
| 0.01 | 0.638 | 0.581 | 0.038 |
| 0.1 | 0.718 | 0.631 | 0.040 |
| 1.0 | 0.808 | 0.651 | 0.040 |
| 10.0 | 0.898 | 0.655 | 0.035 |
| 100.0 | 0.952 | 0.643 | 0.031 |

Best C: **10.0**
Grouped CV macro-F1: **0.655 +/- 0.037**
Naive (ungrouped) CV macro-F1: 0.802 (leakage would inflate the score by +0.147)
Chance level: ~0.167
