# frozen_string_literal: true

module AgentsID
  class AgentsIDError < StandardError
    attr_reader :code, :status_code

    def initialize(message, code: "UNKNOWN", status_code: nil)
      super(message)
      @code = code
      @status_code = status_code
    end
  end

  class AuthenticationError < AgentsIDError
    def initialize(message = "Invalid or missing API key")
      super(message, code: "AUTH_ERROR", status_code: 401)
    end
  end

  class PermissionDeniedError < AgentsIDError
    attr_reader :tool, :reason

    def initialize(tool, reason)
      @tool = tool
      @reason = reason
      super(
        "Permission denied for tool \"#{tool}\": #{reason}",
        code: "PERMISSION_DENIED",
        status_code: 403
      )
    end
  end

  class TokenExpiredError < AgentsIDError
    def initialize
      super("Agent token has expired", code: "TOKEN_EXPIRED", status_code: 401)
    end
  end

  class TokenRevokedError < AgentsIDError
    def initialize
      super("Agent token has been revoked", code: "TOKEN_REVOKED", status_code: 401)
    end
  end
end
