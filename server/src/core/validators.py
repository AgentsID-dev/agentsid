"""Shared validation utilities — importable without circular dependencies."""

import ipaddress
import socket
from urllib.parse import urlparse

# Private/reserved IP ranges that webhooks must not target
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def validate_webhook_url(url: str) -> str:
    """Validate that a webhook URL is safe (no SSRF).

    Resolves the hostname and checks all resulting IPs against blocked
    private/reserved ranges.  Raises ValueError on any violation.
    """
    parsed = urlparse(url)

    # Must use HTTPS (allow HTTP only for localhost in dev)
    if parsed.scheme not in ("https", "http"):
        raise ValueError("Webhook URL must use HTTPS")
    if parsed.scheme == "http" and parsed.hostname not in ("localhost", "127.0.0.1"):
        raise ValueError("Webhook URL must use HTTPS (HTTP only allowed for localhost)")

    if not parsed.hostname:
        raise ValueError("Webhook URL must include a hostname")

    # Resolve hostname and check against blocked IP ranges
    try:
        resolved_ips = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        raise ValueError(f"Could not resolve webhook hostname: {parsed.hostname}")

    for _family, _type, _proto, _canonname, sockaddr in resolved_ips:
        ip = ipaddress.ip_address(sockaddr[0])
        for network in _BLOCKED_NETWORKS:
            if ip in network:
                raise ValueError(
                    "Webhook URL must not target private or reserved IP addresses"
                )

    return url
