from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List, Sequence, Tuple, Optional

import torch as T

from .dataset import PairDataset
from .model import MLPScore


# ================== Utils ==================


def _load_json(path: Path) -> Dict:
    path = Path(path)
    if not path.exists() or path.stat().st_size == 0:
        raise FileNotFoundError(f"Missing/empty JSON: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def load_titles_from_item_feats(item_feats_path: Path) -> Dict[str, str]:
    """
    Ưu tiên lấy title từ item_feats.json:
      {
        "11-1011.00": { "text": [...], "riasec": [...], "title": "Chief Executives" },
        ...
      }
    """
    titles: Dict[str, str] = {}
    if not item_feats_path.exists():
        return titles

    try:
        obj = _load_json(item_feats_path)
        for jid, meta in obj.items():
            if isinstance(meta, dict):
                t = meta.get("title")
                if t:
                    titles[str(jid)] = str(t)
    except Exception:
        # Không bắt buộc phải có title
        pass
    return titles


def load_titles_from_catalog(csv_path: Path) -> Dict[str, str]:
    """
    Fallback: đọc từ CSV catalog (cột: job_id hoặc onet_code, title).
    """
    titles: Dict[str, str] = {}
    if not csv_path.exists():
        return titles

    try:
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                jid = row.get("job_id") or row.get("onet_code")
                title = row.get("title")
                if jid and title:
                    titles[str(jid)] = str(title)
    except Exception:
        # Không critical
        pass

    return titles


def _project_root() -> Path:
    """
    Trả về root của package ai-core:
    .../packages/ai-core
    infer.py nằm ở: packages/ai-core/src/ai_core/recsys/neumf/infer.py
    → parents[4] = packages/ai-core
    """
    return Path(__file__).resolve().parents[4]


def _default_model_path() -> Path:
    # models/recsys_mlp/best.pt
    return _project_root() / "models" / "recsys_mlp" / "best.pt"


def _default_user_feats_path() -> Path:
    # data/processed/user_feats.json
    return _project_root() / "data" / "processed" / "user_feats.json"


def _default_item_feats_path() -> Path:
    # data/processed/item_feats.json
    return _project_root() / "data" / "processed" / "item_feats.json"


# ================== Core Ranker API ==================


class Ranker:
    """
    B4 – Ranker NeuMF/MLP (inference cho API & backend).

    - Lazy-load model + user_feats + item_feats.
    - API chính: infer_scores(user_id, candidate_ids).
    """

    def __init__(
        self,
        model_path: Optional[str | Path] = None,
        user_feats_path: Optional[str | Path] = None,
        item_feats_path: Optional[str | Path] = None,
        device: Optional[str] = None,
    ) -> None:
        self.model_path = Path(model_path or _default_model_path())
        self.user_feats_path = Path(user_feats_path or _default_user_feats_path())
        self.item_feats_path = Path(item_feats_path or _default_item_feats_path())

        # Device: ưu tiên CPU cho server đơn giản
        self.device = T.device(device or "cpu")

        self._model: Optional[MLPScore] = None
        self._user_feats: Optional[Dict[str, Dict]] = None
        self._item_feats: Optional[Dict[str, Dict]] = None

    # ---- lazy load helpers ----

    def _load_user_feats(self) -> Dict[str, Dict]:
        if self._user_feats is None:
            self._user_feats = _load_json(self.user_feats_path)
        return self._user_feats

    def _load_item_feats(self) -> Dict[str, Dict]:
        if self._item_feats is None:
            self._item_feats = _load_json(self.item_feats_path)
        return self._item_feats


    def _load_model(self) -> MLPScore:
        """
        Load model từ best.pt. Hỗ trợ:
        - torch.save(state_dict)
        - torch.save({"state_dict": state_dict, ...})

        Lưu ý: MLPScore trong project hiện tại KHÔNG nhận tham số in_dim,
        mà tự tính kích thước input bên trong (dim_text, use_item_riasec...).
        """
        if self._model is not None:
            return self._model

        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing model checkpoint: {self.model_path}")

        # KHÔNG truyền in_dim nữa
        model = MLPScore()

        state = T.load(str(self.model_path), map_location=self.device)

        # Hỗ trợ cả dạng {"state_dict": ...}
        if isinstance(state, dict) and "state_dict" in state and isinstance(
            state["state_dict"], dict
        ):
            state = state["state_dict"]

        model.load_state_dict(state)
        model.to(self.device)
        model.eval()
        self._model = model
        return model


    # ---- public API ----

    def infer_scores(
        self,
        user_id: int | str,
        candidate_ids: Sequence[str],
    ) -> List[Tuple[str, float]]:
        """
        Chấm điểm danh sách candidate job_ids cho 1 user.

        Parameters
        ----------
        user_id : int | str
            ID user (key trong user_feats.json là string).
        candidate_ids : Sequence[str]
            Danh sách job_id (O*NET code hoặc ID nội bộ) cần chấm.

        Returns
        -------
        List[Tuple[str, float]]
            Danh sách (job_id, score) sort giảm dần theo score.
        """
        user_feats = self._load_user_feats()
        item_feats = self._load_item_feats()

        uid = str(user_id)
        if uid not in user_feats:
            raise ValueError(
                f"user_id={uid} không có trong user_feats (len={len(user_feats)})"
            )

        # Lọc candidate tồn tại trong item_feats
        cand: List[str] = [j for j in candidate_ids if j in item_feats]
        if not cand:
            return []

        # Chuẩn pairs giả (label=0, không dùng trong inference)
        pairs = [(uid, j, 0.0) for j in cand]

        ds = PairDataset(pairs, user_feats, item_feats)
        if len(ds) == 0:
            return []

        # Nếu muốn có thể assert cho chắc, nhưng không truyền in_dim vào model
        x0, _ = ds[0]
        # in_dim = x0.shape[-1]  # không dùng nữa

        model = self._load_model()


        # Batch infer
        X = T.stack([ds[i][0] for i in range(len(ds))]).to(self.device)
        with T.no_grad():
            logits = model(X)  # [N]
            scores = T.sigmoid(logits).cpu().numpy().reshape(-1)

        ranked = sorted(
            zip(cand, scores),
            key=lambda x: float(x[1]),
            reverse=True,
        )
        return [(jid, float(sc)) for jid, sc in ranked]


# ================== Functional wrapper ==================


def infer_scores(
    user_id: int | str,
    candidates: Sequence[str],
    user_feats: Optional[Dict[str, Dict]] = None,
    item_feats: Optional[Dict[str, Dict]] = None,
    model_path: str | Path | None = None,
) -> List[Tuple[str, float]]:
    """
    Wrapper functional (giữ backward-compat), chủ yếu dùng cho scripts/CLI.

    Nếu truyền sẵn user_feats / item_feats → dùng luôn (không reload).
    Nếu không truyền → Ranker sẽ tự load từ file mặc định.
    """
    if user_feats is None or item_feats is None:
        rk = Ranker(model_path=model_path)
        return rk.infer_scores(user_id=user_id, candidate_ids=candidates)

    # Trường hợp đặc biệt: muốn dùng cache ngoài (ít dùng trong app chính)
    rk = Ranker(model_path=model_path)
    rk._user_feats = user_feats  # type: ignore[attr-defined]
    rk._item_feats = item_feats  # type: ignore[attr-defined]
    return rk.infer_scores(user_id=user_id, candidate_ids=candidates)


# ================== CLI (debug / offline) ==================


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Infer Top-K careers for a user with NeuMF/MLP."
    )
    ap.add_argument(
        "--model",
        default=str(_default_model_path()),
        help="Đường dẫn best.pt (mặc định: models/recsys_mlp/best.pt)",
    )
    ap.add_argument(
        "--user_feats",
        default=str(_default_user_feats_path()),
        help="user_feats.json (mặc định: data/processed/user_feats.json)",
    )
    ap.add_argument(
        "--item_feats",
        default=str(_default_item_feats_path()),
        help="item_feats.json (mặc định: data/processed/item_feats.json)",
    )
    ap.add_argument(
        "--user_id",
        required=True,
        help="User ID (string hoặc int; key trong user_feats.json)",
    )
    ap.add_argument(
        "--topk",
        type=int,
        default=20,
        help="Số lượng nghề top-K muốn in ra (default=20)",
    )
    ap.add_argument(
        "--candidates",
        nargs="*",
        help=(
            "(Optional) danh sách job_id (O*NET code) để chấm. "
            "Nếu bỏ trống → dùng toàn bộ item_feats."
        ),
    )
    ap.add_argument(
        "--catalog_csv",
        default=str(_project_root() / "data" / "catalog" / "jobs.csv"),
        help="CSV fallback để map title (cột: job_id hoặc onet_code, title).",
    )
    ap.add_argument(
        "--verbose",
        action="store_true",
        help="In thêm thông tin debug.",
    )
    args = ap.parse_args()

    user_feats_path = Path(args.user_feats)
    item_feats_path = Path(args.item_feats)
    model_path = Path(args.model)
    catalog_path = Path(args.catalog_csv)

    # Load features
    try:
        uf = _load_json(user_feats_path)
        it = _load_json(item_feats_path)
    except FileNotFoundError as e:
        print(f"[ERROR] {e}", flush=True)
        print(
            "[HINT] Hãy chạy build_feats_from_db.py để sinh user_feats.json & item_feats.json.",
            flush=True,
        )
        return

    # Chuẩn candidates
    if args.candidates:
        cand = [j for j in args.candidates if j in it]
    else:
        cand = list(it.keys())

    if not cand:
        print("[WARN] Không có candidate nào khớp item_feats.", flush=True)
        return

    # Ranker dùng cache đã load
    rk = Ranker(
        model_path=model_path,
        user_feats_path=user_feats_path,
        item_feats_path=item_feats_path,
    )
    rk._user_feats = uf  # type: ignore[attr-defined]
    rk._item_feats = it  # type: ignore[attr-defined]

    ranked = rk.infer_scores(user_id=args.user_id, candidate_ids=cand)
    ranked = ranked[: args.topk]

    # Map title
    title_map = load_titles_from_item_feats(item_feats_path) or load_titles_from_catalog(
        catalog_path
    )

    if args.verbose:
        print(
            f"[INFO] user={args.user_id} | candidates_in={len(cand)} | "
            f"topk={args.topk} | users={len(uf)} | items={len(it)} | "
            f"titles={len(title_map)}",
            flush=True,
        )

    # In ra: job_id \t title \t score
    for jid, sc in ranked:
        title = title_map.get(jid, "")
        print(f"{jid}\t{title}\t{float(sc):.6f}")


if __name__ == "__main__":
    main()
