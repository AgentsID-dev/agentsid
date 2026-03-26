"""AgentsID error classes."""


class AgentsIDError(Exception):
    def __init__(self, message: str, code: str = "UNKNOWN", status_code: int | None = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


class AuthenticationError(AgentsIDError):
    def __init__(self, message: str = "Invalid or missing API key"):
        super().__init__(message, "AUTH_ERROR", 401)


class PermissionDeniedError(AgentsIDError):
    def __init__(self, tool: str, reason: str):
        super().__init__(f'Permission denied for tool "{tool}": {reason}', "PERMISSION_DENIED", 403)
        self.tool = tool
        self.reason = reason


class TokenExpiredError(AgentsIDError):
    def __init__(self):
        super().__init__("Agent token has expired", "TOKEN_EXPIRED", 401)


class TokenRevokedError(AgentsIDError):
    def __init__(self):
        super().__init__("Agent token has been revoked", "TOKEN_REVOKED", 401)
