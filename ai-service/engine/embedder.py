"""Thin wrapper around SentenceTransformer so build_index.py, main.py's
/match, and /embed all share one loaded model and the same normalization
convention (unit-length vectors, cosine similarity == dot product).
"""

import numpy as np
from sentence_transformers import SentenceTransformer


class Embedder:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = SentenceTransformer(model_name)

    def encode(self, texts: list[str], batch_size: int = 64, show_progress_bar: bool = False) -> np.ndarray:
        return self._model.encode(
            texts, batch_size=batch_size, show_progress_bar=show_progress_bar,
            normalize_embeddings=True, convert_to_numpy=True,
        )

    def encode_one(self, text: str) -> np.ndarray:
        return self.encode([text])[0]
