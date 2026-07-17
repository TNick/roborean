"""Document driver and template errors."""


class DriverError(Exception):
    """Base document driver failure."""


class UnsupportedOperationError(DriverError):
    """Operation not in the driver's capability set."""


class TemplateError(DriverError):
    """Template missing or invalid."""
