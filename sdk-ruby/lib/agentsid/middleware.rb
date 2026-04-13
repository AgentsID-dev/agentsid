# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

require_relative "errors"

module AgentsID
  DEFAULT_BASE_URL_MW = "https://agentsid.dev"

  # Validate a single tool call against AgentsID.
  #
  # @param project_key [String]
  # @param token [String]
  # @param tool [String]
  # @param params [Hash, nil]
  # @param base_url [String]
  # @return [Hash]
  def self.validate_tool_call(project_key:, token:, tool:, params: nil, base_url: DEFAULT_BASE_URL_MW)
    uri = URI("#{base_url.chomp('/')}/api/v1/validate")

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = 10
    http.read_timeout = 10

    req = Net::HTTP::Post.new(uri)
    req["Content-Type"] = "application/json"
    req["Authorization"] = "Bearer #{project_key}"
    req.body = JSON.generate({ token: token, tool: tool, params: params })

    response = http.request(req)
    status = response.code.to_i

    unless (200..299).cover?(status)
      return { "valid" => false, "reason" => "Validation failed: #{status}" }
    end

    JSON.parse(response.body)
  end

  # MCP middleware -- validates tool calls against AgentsID.
  #
  # Usage:
  #   middleware = AgentsID::MCPMiddleware.new(project_key: "aid_proj_...")
  #
  #   # In your MCP tool handler:
  #   result = middleware.validate(bearer_token, "my_tool", params)
  class MCPMiddleware
    # @param project_key [String] Your AgentsID project key
    # @param base_url [String] AgentsID server URL
    # @param skip_tools [Array<String>, nil] Tool names to skip validation for
    # @param on_denied [Proc, nil] Callback invoked on denial instead of raising
    def initialize(project_key:, base_url: DEFAULT_BASE_URL_MW, skip_tools: nil, on_denied: nil)
      @project_key = project_key
      @base_url = base_url.chomp("/")
      @skip_tools = Set.new(skip_tools || [])
      @on_denied = on_denied
    end

    # Validate a tool call. Raises on denial unless on_denied is set.
    #
    # @param token [String]
    # @param tool [String]
    # @param params [Hash, nil]
    # @return [Hash]
    def validate(token, tool, params = nil)
      if @skip_tools.include?(tool)
        return { "valid" => true, "reason" => "Tool in skip list" }
      end

      result = AgentsID.validate_tool_call(
        project_key: @project_key,
        token: token,
        tool: tool,
        params: params,
        base_url: @base_url
      )

      unless result["valid"]
        reason = result["reason"] || "Unknown"
        raise TokenExpiredError.new if reason.include?("expired")
        raise TokenRevokedError.new if reason.include?("revoked")
      end

      permission = result["permission"] || {}
      if permission.any? && !permission["allowed"]
        denial_reason = permission["reason"] || "Denied"
        if @on_denied
          @on_denied.call(tool, denial_reason)
        else
          raise PermissionDeniedError.new(tool, denial_reason)
        end
      end

      result
    end

    # Quick check -- returns true/false without raising.
    #
    # @param token [String]
    # @param tool [String]
    # @return [Boolean]
    def allowed?(token, tool)
      result = AgentsID.validate_tool_call(
        project_key: @project_key,
        token: token,
        tool: tool,
        base_url: @base_url
      )
      result["valid"] == true && result.dig("permission", "allowed") == true
    rescue StandardError
      false
    end
  end

  # Factory method matching the Python SDK's create_mcp_middleware.
  #
  # @param project_key [String]
  # @param base_url [String]
  # @param skip_tools [Array<String>, nil]
  # @return [MCPMiddleware]
  def self.create_mcp_middleware(project_key:, base_url: DEFAULT_BASE_URL_MW, skip_tools: nil)
    MCPMiddleware.new(
      project_key: project_key,
      base_url: base_url,
      skip_tools: skip_tools
    )
  end
end
