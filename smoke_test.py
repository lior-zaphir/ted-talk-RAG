#!/usr/bin/env python3
"""
CLI smoke test for the deployed TED Talk RAG API.

Usage:
  python3 smoke_test.py --base-url https://ted-talk-rag-pi.vercel.app

Or set SMOKE_BASE_URL:
  SMOKE_BASE_URL=https://ted-talk-rag-pi.vercel.app python3 smoke_test.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, Tuple

import requests


def _fail(msg: str) -> None:
    print(f"[FAIL] {msg}", file=sys.stderr)
    sys.exit(1)


def _ok(msg: str) -> None:
    print(f"[OK] {msg}")


def _norm_base_url(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return ""
    return s[:-1] if s.endswith("/") else s


def _get_json(url: str, timeout_s: int) -> Tuple[int, Dict[str, Any], str]:
    r = requests.get(url, timeout=timeout_s)
    text = r.text or ""
    try:
        return r.status_code, r.json(), text
    except Exception:
        return r.status_code, {}, text


def _post_json(url: str, payload: Dict[str, Any], timeout_s: int) -> Tuple[int, Dict[str, Any], str]:
    r = requests.post(url, json=payload, timeout=timeout_s)
    text = r.text or ""
    try:
        return r.status_code, r.json(), text
    except Exception:
        return r.status_code, {}, text


def _assert_has(d: Dict[str, Any], key: str) -> None:
    if key not in d:
        _fail(f"Missing key '{key}' in response JSON. Keys: {list(d.keys())}")


def main() -> None:
    p = argparse.ArgumentParser(description="Smoke test for deployed TED Talk RAG API")
    p.add_argument("--base-url", default=os.environ.get("SMOKE_BASE_URL", ""), help="Deployment base URL")
    p.add_argument("--timeout", type=int, default=30, help="HTTP timeout seconds")
    p.add_argument("--pause", type=float, default=0.0, help="Pause seconds between requests (avoid rate limits)")
    args = p.parse_args()

    base = _norm_base_url(args.base_url)
    if not base:
        _fail("Missing base URL. Pass --base-url or set SMOKE_BASE_URL.")

    stats_url = f"{base}/api/stats"
    prompt_url = f"{base}/api/prompt"

    print(f"Base URL: {base}")

    # 1) /api/stats
    code, data, raw = _get_json(stats_url, args.timeout)
    if code != 200:
        _fail(f"GET /api/stats expected 200, got {code}. Body: {raw[:500]}")
    for k in ("chunk_size", "overlap_ratio", "top_k"):
        _assert_has(data, k)
    _ok("GET /api/stats returned required fields")

    if args.pause:
        time.sleep(args.pause)

    # 2) /api/prompt tests (representative question types)
    tests = [
        (
            "multi_title_list_exact_3",
            "List exactly 3 TED talk titles about climate change.",
            lambda resp: _assert_exactly_three_titles(resp),
        ),
        (
            "precise_fact",
            "What year was the talk titled \"Do schools kill creativity?\" published?",
            lambda resp: _assert_standard_prompt_shape(resp),
        ),
        (
            "summary",
            "Summarize the key idea of the talk about vulnerability by Brené Brown.",
            lambda resp: _assert_standard_prompt_shape(resp),
        ),
        (
            "recommendation",
            "Recommend a TED talk about procrastination and justify using evidence from the transcript.",
            lambda resp: _assert_standard_prompt_shape(resp),
        ),
    ]

    for name, q, check in tests:
        code, data, raw = _post_json(prompt_url, {"question": q}, args.timeout)
        if code != 200:
            _fail(f"POST /api/prompt ({name}) expected 200, got {code}. Body: {raw[:800]}")
        if not data:
            _fail(f"POST /api/prompt ({name}) returned non-JSON body. Body: {raw[:800]}")
        check(data)
        _ok(f"POST /api/prompt ({name}) OK")
        if args.pause:
            time.sleep(args.pause)

    print("\nAll smoke tests passed.")


def _assert_standard_prompt_shape(resp: Dict[str, Any]) -> None:
    _assert_has(resp, "response")
    _assert_has(resp, "context")
    _assert_has(resp, "Augmented_prompt")
    ap = resp.get("Augmented_prompt") or {}
    if not isinstance(ap, dict):
        _fail("Augmented_prompt must be an object")
    for k in ("System", "User"):
        if k not in ap:
            _fail(f"Augmented_prompt missing '{k}'")


def _assert_exactly_three_titles(resp: Dict[str, Any]) -> None:
    _assert_standard_prompt_shape(resp)
    out = resp.get("response", "")
    if not isinstance(out, str):
        _fail("response must be a string")
    titles = [line.strip() for line in out.splitlines() if line.strip()]
    if len(titles) != 3:
        _fail(f"Expected exactly 3 titles (3 non-empty lines), got {len(titles)}. response:\n{out}")


if __name__ == "__main__":
    main()


