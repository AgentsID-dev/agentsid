const Terms = () => {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Header */}
      <header className="mb-10 pb-8 border-b border-border">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          Terms of Service
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            Effective March 26, 2026
          </span>
          <span>Last updated: March 26, 2026</span>
          <span>agentsid.dev</span>
        </div>
      </header>

      {/* Disclaimer Banner */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5 mb-12 text-sm text-muted-foreground leading-relaxed">
        <strong className="text-amber-600 dark:text-amber-500">Note for developers:</strong>{" "}
        This document is specific to AgentsID and written to be read in under 5 minutes. We use
        plain language intentionally. If anything is unclear, email{" "}
        <a href="mailto:legal@agentsid.dev" className="text-primary hover:underline">
          legal@agentsid.dev
        </a>
        .
      </div>

      {/* 1. The Agreement */}
      <section className="mb-14 scroll-mt-20" id="agreement">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            1
          </span>
          The Agreement
        </h2>
        <p className="mb-4 text-foreground">
          These Terms of Service (&quot;Terms&quot;) form a binding agreement between you (&quot;you&quot; or
          &quot;User&quot;) and AgentsID (&quot;AgentsID,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your use of{" "}
          <strong>agentsid.dev</strong> and all related APIs, SDKs, and services (collectively, the
          &quot;Service&quot;).
        </p>
        <p className="mb-4 text-foreground">
          By creating an account or using the Service, you agree to these Terms. If you are using the
          Service on behalf of a company or organization, you represent that you have authority to bind
          that entity, and &quot;you&quot; refers to both you and the entity.
        </p>
        <p className="text-foreground">If you do not agree, do not use the Service.</p>
      </section>

      {/* 2. What AgentsID Does */}
      <section className="mb-14 scroll-mt-20" id="service">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            2
          </span>
          What AgentsID Does
        </h2>
        <p className="mb-4 text-foreground">
          AgentsID is an authentication and identity platform for AI agents. It lets you:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>Create projects and register AI agents with unique identities</li>
          <li>Define permission rules that govern what those agents are allowed to do</li>
          <li>Validate tool calls made by agents at runtime against those permission rules</li>
          <li>Review tamper-evident audit logs of every allow/deny decision</li>
          <li>Manage delegation chains between agents</li>
        </ul>
        <p className="text-foreground">
          AgentsID is a <strong>tooling platform</strong>. We provide the infrastructure for agent
          authentication and permission enforcement. We do not control, operate, or take responsibility
          for the AI agents, applications, or automated systems you build using this infrastructure.
        </p>
      </section>

      {/* 3. Accounts */}
      <section className="mb-14 scroll-mt-20" id="accounts">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            3
          </span>
          Accounts
        </h2>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Registration</h3>
        <p className="mb-4 text-foreground">
          You must create an account to use AgentsID. You agree to provide accurate information and
          keep it up to date. Your account is personal — do not share credentials or allow others to
          access your account.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Age requirement</h3>
        <p className="mb-4 text-foreground">
          You must be at least 13 years old to use the Service. If you are under 18, you represent
          that a parent or legal guardian has reviewed and agreed to these Terms on your behalf.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Account security</h3>
        <p className="mb-4 text-foreground">
          You are responsible for everything that happens under your account. That includes:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>Keeping your password and API keys confidential</li>
          <li>Rotating API keys immediately if you suspect a compromise</li>
          <li>
            Notifying us promptly at{" "}
            <a href="mailto:legal@agentsid.dev" className="text-primary hover:underline">
              legal@agentsid.dev
            </a>{" "}
            if you believe your account has been accessed without authorization
          </li>
        </ul>
        <p className="text-foreground">
          AgentsID stores API key <em>hashes</em>, never raw keys. If you lose an API key, you will
          need to rotate it — we cannot recover it for you.
        </p>
      </section>

      {/* 4. Acceptable Use */}
      <section className="mb-14 scroll-mt-20" id="acceptable-use">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            4
          </span>
          Acceptable Use
        </h2>
        <p className="mb-4 text-foreground">
          You may use AgentsID for any lawful purpose. You may not:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>
            <strong>Abuse the platform.</strong> Deliberately send malformed requests, attempt to
            exhaust API resources, or disrupt the Service for others.
          </li>
          <li>
            <strong>Circumvent security controls.</strong> Attempt to bypass, reverse-engineer, or
            exploit AgentsID&apos;s authentication mechanisms, HMAC verification, or audit log integrity.
          </li>
          <li>
            <strong>Register agents for illegal activity.</strong> Use agent identities or permission
            rules to authorize actions that violate any applicable law, including unauthorized access
            to computer systems, fraud, or harassment.
          </li>
          <li>
            <strong>Scrape or harvest data.</strong> Bulk-extract data from AgentsID&apos;s interfaces
            beyond what your own projects and agents require.
          </li>
          <li>
            <strong>Resell without permission.</strong> Offer AgentsID&apos;s API as a white-label service
            to third parties without an explicit written agreement with us.
          </li>
          <li>
            <strong>Impersonate AgentsID.</strong> Misrepresent your agents or projects as being
            affiliated with or operated by AgentsID.
          </li>
        </ul>
        <p className="text-foreground">
          We reserve the right to determine what constitutes a violation of these rules. Violations
          may result in immediate account suspension or termination (see Section 13).
        </p>
      </section>

      {/* 5. Plans & Billing */}
      <section className="mb-14 scroll-mt-20" id="plans">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            5
          </span>
          Plans &amp; Billing
        </h2>

        <div className="overflow-x-auto my-5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="bg-primary/10 font-bold text-left p-2.5 sm:px-4 border border-border text-foreground text-xs uppercase tracking-wide">
                  Plan
                </th>
                <th className="bg-primary/10 font-bold text-left p-2.5 sm:px-4 border border-border text-foreground text-xs uppercase tracking-wide">
                  Events / month
                </th>
                <th className="bg-primary/10 font-bold text-left p-2.5 sm:px-4 border border-border text-foreground text-xs uppercase tracking-wide">
                  Agents
                </th>
                <th className="bg-primary/10 font-bold text-left p-2.5 sm:px-4 border border-border text-foreground text-xs uppercase tracking-wide">
                  Audit retention
                </th>
                <th className="bg-primary/10 font-bold text-left p-2.5 sm:px-4 border border-border text-foreground text-xs uppercase tracking-wide">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-muted/50">
                <td className="p-2.5 sm:px-4 border border-border bg-background">
                  <strong>Free</strong>
                </td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">1,000</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">5</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">7 days</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">$0</td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-2.5 sm:px-4 border border-border bg-background">
                  <strong>Pro</strong>
                </td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">Unlimited</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">Unlimited</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">30 days</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">$49 / month</td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-2.5 sm:px-4 border border-border bg-background">
                  <strong>Enterprise</strong>
                </td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">Custom</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">Custom</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">90 days</td>
                <td className="p-2.5 sm:px-4 border border-border bg-background">Contact us</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">
          Billing terms (Pro and Enterprise)
        </h3>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>
            Paid plans are billed monthly in advance. Your billing cycle starts on the date you
            upgrade.
          </li>
          <li>All fees are in USD and are non-refundable, except where required by law.</li>
          <li>We will give you at least 30 days&apos; notice before changing Pro plan pricing.</li>
          <li>
            If your payment method fails, we will retry for 7 days. After that, your account may be
            downgraded to the Free tier, and your data may be subject to the Free tier retention
            limits.
          </li>
          <li>
            You can cancel at any time. Your paid features remain active through the end of the
            billing period you have paid for.
          </li>
        </ul>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Taxes</h3>
        <p className="text-foreground">
          Prices are exclusive of applicable taxes. You are responsible for any sales tax, VAT, GST,
          or similar taxes required by your jurisdiction.
        </p>
      </section>

      {/* 6. Free Tier Limits */}
      <section className="mb-14 scroll-mt-20" id="free-tier">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            6
          </span>
          Free Tier Limits
        </h2>
        <p className="mb-4 text-foreground">
          The Free tier is provided at our discretion to let developers evaluate and build with
          AgentsID. We reserve the right to:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>
            Enforce the 1,000 events/month and 5 agent limits technically (requests over the limit
            will be rejected)
          </li>
          <li>Rate-limit free tier accounts more aggressively than paid accounts</li>
          <li>Modify free tier limits with 30 days&apos; notice</li>
          <li>Discontinue the free tier entirely with 60 days&apos; notice</li>
        </ul>
        <div className="rounded-lg border border-amber-500/25 border-l-4 border-l-amber-500 bg-amber-500/5 p-4 my-5 text-sm leading-relaxed">
          <strong className="block mb-1.5 text-xs uppercase tracking-wide text-amber-600 dark:text-amber-500">
            Important
          </strong>
          Do not build production systems that depend critically on the Free tier without a plan to
          upgrade. Free tier infrastructure is not subject to any uptime commitments.
        </div>
      </section>

      {/* 7. API & Rate Limits */}
      <section className="mb-14 scroll-mt-20" id="api">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            7
          </span>
          API &amp; Rate Limits
        </h2>
        <p className="mb-4 text-foreground">
          AgentsID enforces rate limits to ensure fair use and platform stability. Rate limits vary by
          plan and may be applied per API key, per project, or per IP address.
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>
            If you exceed a rate limit, you will receive an HTTP{" "}
            <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">429</code> response
            with a{" "}
            <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">Retry-After</code>{" "}
            header.
          </li>
          <li>
            Sustained traffic beyond your plan limits may require an upgrade to Pro or Enterprise.
          </li>
          <li>
            We reserve the right to throttle or block traffic patterns that indicate abuse, even
            within nominal limits.
          </li>
        </ul>
        <p className="text-foreground">
          Current rate limit values are documented at{" "}
          <a href="/docs" className="text-primary hover:underline">
            agentsid.dev/docs
          </a>
          . These values may change; breaking changes to the API will be communicated with at least 30
          days&apos; notice.
        </p>
      </section>

      {/* 8. Intellectual Property */}
      <section className="mb-14 scroll-mt-20" id="ip">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            8
          </span>
          Intellectual Property
        </h2>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">
          AgentsID owns the platform
        </h3>
        <p className="mb-4 text-foreground">
          AgentsID and its licensors own all rights to the Service, including the software, APIs,
          design, trademarks, and documentation. These Terms do not grant you any ownership rights.
          You receive a limited, non-exclusive, non-transferable license to use the Service according
          to these Terms.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">You own your data</h3>
        <p className="mb-4 text-foreground">
          You retain ownership of all data you submit to AgentsID: your project configurations, agent
          definitions, permission rules, and audit log data. You grant AgentsID a limited license to
          store and process this data solely to operate the Service on your behalf.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Feedback</h3>
        <p className="text-foreground">
          If you submit suggestions or feedback about AgentsID, you grant us a perpetual, royalty-free
          right to use that feedback without restriction or compensation. We appreciate it — it helps
          us build a better product.
        </p>
      </section>

      {/* 9. Your Data */}
      <section className="mb-14 scroll-mt-20" id="data">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            9
          </span>
          Your Data
        </h2>
        <p className="mb-4 text-foreground">
          We collect and store only what is necessary to operate the Service. This includes:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>Your email address (via Supabase Auth)</li>
          <li>Project names and configuration</li>
          <li>Agent names, permissions, and delegation chain metadata</li>
          <li>API key hashes (never raw keys)</li>
          <li>Audit log entries: tool call records, allow/deny decisions, and timestamps</li>
          <li>Token metadata needed for HMAC verification</li>
        </ul>
        <p className="mb-4 text-foreground">
          For full details on how we handle your data, how long we keep it, and your rights regarding
          it, see our{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          .
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Audit log integrity</h3>
        <p className="mb-4 text-foreground">
          Audit logs are protected by a tamper-evident hash chain. This means we can detect if any log
          entry has been altered after the fact. We do not alter your logs. If you discover any
          integrity anomaly, contact us immediately.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">
          Data retention on plan changes
        </h3>
        <p className="text-foreground">
          If you downgrade from a paid plan to Free, your audit logs will be trimmed to the Free tier
          retention window (7 days) within 30 days of the plan change. Export your logs before
          downgrading if you need to preserve them.
        </p>
      </section>

      {/* 10. Security Disclaimer */}
      <section className="mb-14 scroll-mt-20" id="security-disclaimer">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            10
          </span>
          Security Disclaimer
        </h2>

        <div className="rounded-lg border border-amber-500/25 border-l-4 border-l-amber-500 bg-amber-500/5 p-4 my-5 text-sm leading-relaxed">
          <strong className="block mb-1.5 text-xs uppercase tracking-wide text-amber-600 dark:text-amber-500">
            Read this carefully
          </strong>
          AgentsID is an authentication and permission enforcement tool. Using AgentsID does not make
          your AI system secure. You are responsible for the security of your overall system.
        </div>

        <p className="mb-4 text-foreground">Specifically:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>
            <strong>
              AgentsID is not liable for security breaches in systems that use our platform.
            </strong>{" "}
            We provide tools — HMAC-signed tokens, permission rules, audit logs — but we do not
            control how you integrate, deploy, or configure those tools.
          </li>
          <li>
            A misconfigured permission rule in your project is your responsibility, not ours.
          </li>
          <li>
            An agent that obtains a valid token through unauthorized means (e.g., a stolen API key in
            your environment) will appear legitimate to AgentsID&apos;s verification layer. Protect your
            secrets.
          </li>
          <li>
            AgentsID&apos;s token verification confirms that a token was signed by your project&apos;s secret
            and has not expired. It does not guarantee the agent presenting that token is operating
            within your intended behavioral bounds.
          </li>
        </ul>
        <p className="text-foreground">
          We implement industry-standard security practices (TLS in transit, encrypted storage, access
          controls) and will disclose material security incidents promptly. But security is a shared
          responsibility.
        </p>
      </section>

      {/* 11. No Warranties */}
      <section className="mb-14 scroll-mt-20" id="warranties">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            11
          </span>
          No Warranties
        </h2>
        <p className="mb-4 text-foreground">
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTY OF ANY KIND. TO THE
          MAXIMUM EXTENT PERMITTED BY LAW, AGENTSID EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER
          EXPRESS, IMPLIED, OR STATUTORY, INCLUDING:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>Any implied warranty of merchantability or fitness for a particular purpose</li>
          <li>Any warranty that the Service will be uninterrupted, error-free, or secure</li>
          <li>
            Any warranty regarding the accuracy or reliability of any information provided through the
            Service
          </li>
        </ul>
        <p className="text-foreground">
          We make reasonable efforts to maintain availability and data integrity, but we do not
          guarantee any specific uptime. Planned and unplanned maintenance may result in temporary
          unavailability.
        </p>
      </section>

      {/* 12. Limitation of Liability */}
      <section className="mb-14 scroll-mt-20" id="liability">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            12
          </span>
          Limitation of Liability
        </h2>
        <p className="mb-4 text-foreground">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>
            AgentsID&apos;s total liability to you for any claim arising out of or related to these Terms
            or the Service will not exceed the greater of: (a) the amount you paid to AgentsID in the
            12 months before the claim arose, or (b) $100 USD.
          </li>
          <li>
            AgentsID will not be liable for any indirect, incidental, special, consequential, or
            punitive damages, including lost profits, lost data, business interruption, or
            reputational harm — even if we were advised of the possibility of such damages.
          </li>
        </ul>
        <p className="text-foreground">
          These limitations apply regardless of the legal theory under which a claim is brought
          (contract, tort, strict liability, etc.). Some jurisdictions do not allow certain liability
          limitations, in which case the above limitations apply to the maximum extent permitted by law
          in your jurisdiction.
        </p>
      </section>

      {/* 13. Termination */}
      <section className="mb-14 scroll-mt-20" id="termination">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            13
          </span>
          Termination
        </h2>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">You can leave anytime</h3>
        <p className="mb-4 text-foreground">
          You may close your account at any time from your account settings or by emailing{" "}
          <a href="mailto:legal@agentsid.dev" className="text-primary hover:underline">
            legal@agentsid.dev
          </a>
          . Upon account closure, we will delete your data in accordance with our Privacy Policy.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">
          We can suspend or terminate for cause
        </h3>
        <p className="mb-4 text-foreground">
          We reserve the right to suspend or terminate your account immediately if we determine, in
          our reasonable judgment, that you have:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>Violated these Terms, including the Acceptable Use policy</li>
          <li>Provided false information during registration</li>
          <li>Failed to pay fees when due</li>
          <li>Engaged in conduct that poses a security or legal risk to AgentsID or other users</li>
        </ul>
        <p className="mb-4 text-foreground">
          Where practical, we will give you notice before termination and a reasonable opportunity to
          remedy the issue. For serious violations (abuse, illegal activity, security threats), we may
          act immediately.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Effect of termination</h3>
        <p className="text-foreground">
          Upon termination: your access to the Service ends, your API keys are invalidated, and your
          data is scheduled for deletion. Sections 8 (IP), 10 (Security Disclaimer), 11 (Warranties),
          12 (Liability), 15 (Governing Law), and 16 (Disputes) survive termination.
        </p>
      </section>

      {/* 14. Changes to Terms */}
      <section className="mb-14 scroll-mt-20" id="changes">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            14
          </span>
          Changes to Terms
        </h2>
        <p className="mb-4 text-foreground">
          We may update these Terms from time to time. When we do:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>We will update the &quot;Last updated&quot; date at the top of this page</li>
          <li>
            For material changes, we will send an email to the address on your account at least 14
            days before the changes take effect
          </li>
          <li>
            For minor changes (typo corrections, clarifications that don&apos;t affect your rights), we
            may not send an individual notice
          </li>
        </ul>
        <p className="text-foreground">
          Your continued use of the Service after changes take effect constitutes acceptance of the
          updated Terms. If you disagree with a material change, you may close your account before it
          takes effect.
        </p>
      </section>

      {/* 15. Governing Law */}
      <section className="mb-14 scroll-mt-20" id="governing-law">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            15
          </span>
          Governing Law
        </h2>
        <p className="text-foreground">
          These Terms are governed by the laws of the State of Delaware, United States, without regard
          to conflict of law principles. If any provision of these Terms is found to be unenforceable,
          the remaining provisions will remain in full force.
        </p>
      </section>

      {/* 16. Dispute Resolution */}
      <section className="mb-14 scroll-mt-20" id="disputes">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            16
          </span>
          Dispute Resolution
        </h2>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">
          Informal resolution first
        </h3>
        <p className="mb-4 text-foreground">
          If you have a dispute with AgentsID, please email{" "}
          <a href="mailto:legal@agentsid.dev" className="text-primary hover:underline">
            legal@agentsid.dev
          </a>{" "}
          first. Most issues can be resolved quickly. We will make a good-faith effort to respond
          within 10 business days.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Binding arbitration</h3>
        <p className="mb-4 text-foreground">
          If informal resolution fails, any dispute arising from these Terms or the Service will be
          resolved by binding individual arbitration administered by the American Arbitration
          Association (AAA) under its Consumer Arbitration Rules. Arbitration will be conducted in
          Delaware or remotely. The arbitrator&apos;s decision is final and binding.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Class action waiver</h3>
        <p className="mb-4 text-foreground">
          You waive any right to bring claims as a class action, consolidated action, or
          representative action. All disputes must be brought in your individual capacity.
        </p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Exception</h3>
        <p className="text-foreground">
          Either party may seek injunctive or other equitable relief in a court of competent
          jurisdiction to prevent irreparable harm, without first going through arbitration.
        </p>
      </section>

      {/* 17. Contact */}
      <section className="mb-14 scroll-mt-20" id="contact">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
            17
          </span>
          Contact
        </h2>
        <p className="mb-4 text-foreground">
          For legal inquiries, Terms questions, or account issues:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
          <li>
            Email:{" "}
            <a href="mailto:legal@agentsid.dev" className="text-primary hover:underline">
              legal@agentsid.dev
            </a>
          </li>
          <li>
            Website:{" "}
            <a
              href="https://agentsid.dev"
              className="text-primary hover:underline"
            >
              agentsid.dev
            </a>
          </li>
        </ul>
        <p className="text-foreground">We are a small team. We read every message.</p>
      </section>
    </article>
  );
};

export { Terms };
