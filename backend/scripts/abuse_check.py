"""P0 acceptance check: hammer the scan endpoint and confirm spend is bounded.

Uploads the same generated image N//2 times (dedup should cache after the
first), then N//2 unique images (quota should throttle at the daily cap).
Prints a tally of status codes. Success looks like: 201s (fresh model
calls) never exceed DAILY_SCAN_LIMIT; everything else is 200 (cached),
429 (quota), or 503 (global budget).

Usage:
    python scripts/abuse_check.py --email you@example.com --password pw --count 500
"""

import argparse
import io
import random
from collections import Counter

import httpx
from PIL import Image


def make_image(seed: int) -> bytes:
    rng = random.Random(seed)
    img = Image.new(
        "RGB", (600, 800),
        (rng.randint(0, 255), rng.randint(0, 255), rng.randint(0, 255)),
    )
    out = io.BytesIO()
    img.save(out, format="JPEG")
    return out.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--count", type=int, default=500)
    args = parser.parse_args()

    client = httpx.Client(base_url=args.base_url, timeout=60)

    resp = client.post(
        "/api/auth/login", json={"email": args.email, "password": args.password}
    )
    resp.raise_for_status()
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    statuses: Counter = Counter()

    identical = make_image(seed=42)
    for _ in range(args.count // 2):
        r = client.post(
            "/api/wardrobe/scan", headers=headers,
            files={"file": ("same.jpg", identical, "image/jpeg")},
        )
        statuses[r.status_code] += 1

    for i in range(args.count - args.count // 2):
        r = client.post(
            "/api/wardrobe/scan", headers=headers,
            files={"file": (f"unique{i}.jpg", make_image(seed=i), "image/jpeg")},
        )
        statuses[r.status_code] += 1

    print("Status code tally:", dict(statuses))
    print(
        "Bounded-spend check: 201 responses (fresh model calls) =",
        statuses.get(201, 0),
        "- must never exceed DAILY_SCAN_LIMIT.",
    )


if __name__ == "__main__":
    main()
