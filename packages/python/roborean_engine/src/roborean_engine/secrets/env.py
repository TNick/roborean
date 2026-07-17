"""Environment-backed secret resolver."""

import os


class EnvSecretResolver:
    """Resolve ``sec:env:NAME`` references from process environment."""

    def resolve(self, ref: str) -> str:
        """Load an environment variable named after the ref suffix.

        Args:
            ref: Opaque secret reference of the form ``sec:env:NAME``.

        Returns:
            Secret value from ``os.environ`` for ``NAME``.

        Raises:
            KeyError: When the ref is malformed or the variable is unset.
        """
        # Expect sec:env:<name>; name may itself contain colons.
        parts = ref.split(":")
        if len(parts) < 3 or parts[0] != "sec" or parts[1] != "env":
            raise KeyError(ref)

        name = ":".join(parts[2:])
        if name not in os.environ:
            raise KeyError(ref)

        return os.environ[name]
