"""Shared slowapi rate limiter.

Lives in its own module so routes can import it without a circular
import through main.py.

Deployment note: per-IP limiting keys on the client address, so the app
must see the real client IP. Behind a reverse proxy, run uvicorn with
--proxy-headers and set --forwarded-allow-ips appropriately, otherwise
every request appears to come from the proxy and shares one bucket.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address


limiter = Limiter(key_func=get_remote_address)
