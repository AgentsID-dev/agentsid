# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

require_relative "errors"

module AgentsID
  DEFAULT_BASE_URL = "https://agentsid.dev"
  DEFAULT_TIMEOUT = 10

  # AgentsID client -- register agents, validate tokens, manage permissions.
  class Client
    # @param project_key [String] Your AgentsID project key (aid_proj_...)
    # @param base_url [String] AgentsID server URL
    # @param timeout [Integer] HTTP timeout in seconds
    def initialize(project_key:, base_url: DEFAULT_BASE_URL, timeout: DEFAULT_TIMEOUT)
      raise AgentsIDError.new("project_key is required", code: "CONFIG_ERROR") if project_key.nil? || project_key.empty?

      @project_key = project_key
      @base_url = base_url.chomp("/")
      @timeout = timeout
    end

    # -----------------------------------------------------------
    # AGENTS
    # -----------------------------------------------------------

    # Register a new agent identity and issue a token.
    #
    # @param name [String]
    # @param on_behalf_of [String]
    # @param permissions [Array<String>, nil]
    # @param ttl_hours [Integer, nil]
    # @param metadata [Hash, nil]
    # @return [Hash]
    def register_agent(name:, on_behalf_of:, permissions: nil, ttl_hours: nil, metadata: nil)
      request(:post, "/agents/", {
        name: name,
        on_behalf_of: on_behalf_of,
        permissions: permissions,
        ttl_hours: ttl_hours,
        metadata: metadata
      })
    end

    # @param agent_id [String]
    # @return [Hash]
    def get_agent(agent_id)
      request(:get, "/agents/#{agent_id}")
    end

    # @param status [String, nil] Filter by status
    # @param limit [Integer] Max results (default 50)
    # @return [Array<Hash>]
    def list_agents(status: nil, limit: 50)
      params = {}
      params[:status] = status if status
      params[:limit] = limit if limit != 50
      qs = URI.encode_www_form(params)
      path = qs.empty? ? "/agents/" : "/agents/?#{qs}"
      request(:get, path)
    end

    # @param agent_id [String]
    # @return [Hash]
    def revoke_agent(agent_id)
      request(:delete, "/agents/#{agent_id}")
    end

    # -----------------------------------------------------------
    # PERMISSIONS
    # -----------------------------------------------------------

    # Set permission rules for an agent.
    #
    # @param agent_id [String]
    # @param rules [Array<Hash>] Each rule: { tool_pattern: "...", action: "allow"|"deny" }
    # @return [Hash]
    def set_permissions(agent_id, rules)
      body = rules.map do |r|
        {
          tool_pattern: r[:tool_pattern] || r["tool_pattern"] || r[:toolPattern] || r["toolPattern"] || "",
          action: r[:action] || r["action"] || "allow",
          conditions: r[:conditions] || r["conditions"],
          priority: r[:priority] || r["priority"] || 0
        }
      end
      request(:put, "/agents/#{agent_id}/permissions", body)
    end

    # @param agent_id [String]
    # @return [Array<Hash>]
    def get_permissions(agent_id)
      data = request(:get, "/agents/#{agent_id}/permissions")
      data.fetch("rules", [])
    end

    # @param agent_id [String]
    # @param tool [String]
    # @param params [Hash, nil]
    # @return [Hash]
    def check_permission(agent_id, tool, params: nil)
      request(:post, "/check", {
        agent_id: agent_id,
        tool: tool,
        params: params
      })
    end

    # -----------------------------------------------------------
    # TOKEN VALIDATION
    # -----------------------------------------------------------

    # @param token [String]
    # @param tool [String, nil]
    # @param params [Hash, nil]
    # @return [Hash]
    def validate_token(token, tool: nil, params: nil)
      request(:post, "/validate", {
        token: token,
        tool: tool,
        params: params
      })
    end

    # -----------------------------------------------------------
    # AUDIT
    # -----------------------------------------------------------

    # @param agent_id [String, nil]
    # @param tool [String, nil]
    # @param action [String, nil]
    # @param since [String, nil] ISO 8601 timestamp
    # @param limit [Integer]
    # @return [Hash]
    def get_audit_log(agent_id: nil, tool: nil, action: nil, since: nil, limit: 100)
      params = {}
      params[:agent_id] = agent_id if agent_id
      params[:tool] = tool if tool
      params[:action] = action if action
      params[:since] = since if since
      params[:limit] = limit
      qs = URI.encode_www_form(params)
      request(:get, "/audit/?#{qs}")
    end

    private

    def request(method, path, body = nil)
      uri = URI("#{@base_url}/api/v1#{path}")

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = @timeout
      http.read_timeout = @timeout

      req = build_request(method, uri, body)

      response = http.request(req)

      handle_response(response)
    end

    def build_request(method, uri, body)
      klass = {
        get: Net::HTTP::Get,
        post: Net::HTTP::Post,
        put: Net::HTTP::Put,
        delete: Net::HTTP::Delete
      }.fetch(method)

      req = klass.new(uri)
      req["Authorization"] = "Bearer #{@project_key}"
      req["Content-Type"] = "application/json"
      req.body = JSON.generate(body) if body
      req
    end

    def handle_response(response)
      status = response.code.to_i

      raise AuthenticationError.new if status == 401
      return {} if status == 204

      data = JSON.parse(response.body)

      unless (200..299).cover?(status)
        message = data["detail"] || "Request failed: #{status}"
        raise AgentsIDError.new(message, code: "API_ERROR", status_code: status)
      end

      data
    end
  end
end
