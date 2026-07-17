"""Environment-backed secret resolver."""

import os


class EnvSecretResolver:
    """Resolve ``sec:env:NAME`` references from process environment."""

    def resolve(self, ref: str) -> str:
        """Load an environment variable named after the ref suffix."""
        parts = ref.split(":")
        if len(parts) < 3 or parts[0] != "sec" or parts[1] != "env":
            raise KeyError(ref)
        name = ":".join(parts[2:])
        if name not in os.environ:
            raise KeyError(ref)
        return os.environ[name]
