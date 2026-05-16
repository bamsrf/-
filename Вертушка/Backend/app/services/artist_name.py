import re

_DISCRIMINATOR_RE = re.compile(r"\s*\(\d+\)\s*$")


def clean_artist_name(name: str | None) -> str:
    if not name:
        return ""
    return _DISCRIMINATOR_RE.sub("", name).strip()
