# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "agentsid"
  spec.version       = "0.1.0"
  spec.authors       = ["AgentsID"]
  spec.email         = ["support@agentsid.dev"]

  spec.summary       = "Ruby SDK for AgentsID — agent identity, permissions, and audit for AI tools"
  spec.description   = "Register AI agents, issue scoped tokens, enforce per-tool permissions, " \
                        "and query audit logs via the AgentsID API. Includes MCP middleware for " \
                        "validating tool calls in MCP servers."
  spec.homepage      = "https://agentsid.dev"
  spec.license       = "MIT"

  spec.required_ruby_version = ">= 3.0.0"

  spec.files         = Dir["lib/**/*.rb"] + ["agentsid.gemspec"]
  spec.require_paths = ["lib"]

  spec.metadata = {
    "homepage_uri"    => spec.homepage,
    "source_code_uri" => "https://github.com/agentsid/sdk-ruby",
    "bug_tracker_uri" => "https://github.com/agentsid/sdk-ruby/issues"
  }
end
