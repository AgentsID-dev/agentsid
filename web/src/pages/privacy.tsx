const SectionNumber = ({ num }: { readonly num: number }) => (
  <span className="inline-flex items-center justify-center w-7 h-7 bg-primary/10 rounded-md text-xs font-bold text-primary shrink-0">
    {num}
  </span>
);

const SummaryDot = ({ color }: { readonly color: string }) => (
  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${color}`} />
);

const Privacy = () => {
  return (
    <article className="max-w-3xl mx-auto px-5 py-12 sm:px-8 sm:py-16">
      {/* Header */}
      <header className="mb-10 pb-8 border-b border-border">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          Privacy Policy
        </h1>
        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
          <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-semibold text-primary">
            Effective March 26, 2026
          </span>
          <span>Last updated: March 26, 2026</span>
          <span>agentsid.dev</span>
        </div>
      </header>

      {/* Quick Summary */}
      <div className="bg-background border border-border rounded-xl p-6 sm:p-7 mb-12">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          The short version
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            <SummaryDot color="bg-green-600" />
            <span>We collect only what we need to run the service — your email, project data, agent definitions, and audit logs.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            <SummaryDot color="bg-green-600" />
            <span>We never store raw API keys. Only hashes.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            <SummaryDot color="bg-red-600" />
            <span>We do not sell your data. Ever.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            <SummaryDot color="bg-blue-500" />
            <span>Analytics (PostHog) is opt-in only, gated behind a cookie consent banner.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            <SummaryDot color="bg-green-600" />
            <span>You can request export or deletion of your data at any time.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            <SummaryDot color="bg-amber-600" />
            <span>Our infrastructure is hosted in the US (Railway + Supabase US West).</span>
          </div>
        </div>
      </div>

      {/* 1. Who We Are */}
      <section className="mb-14 scroll-mt-20" id="who-we-are">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={1} /> Who We Are
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">
          AgentsID operates the authentication and identity platform at <strong>agentsid.dev</strong>. We are a US-based company. References to &quot;AgentsID,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot; in this policy refer to AgentsID.
        </p>
        <p className="mb-4 text-foreground leading-relaxed">
          This Privacy Policy describes what data we collect when you use the Service, how we use it, who we share it with, and your rights regarding it.
        </p>
        <p className="text-foreground leading-relaxed">
          Questions? Email <a href="mailto:privacy@agentsid.dev" className="text-primary hover:underline">privacy@agentsid.dev</a>.
        </p>
      </section>

      {/* 2. Data We Collect */}
      <section className="mb-14 scroll-mt-20" id="data-we-collect">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={2} /> Data We Collect
        </h2>
        <p className="mb-5 text-foreground leading-relaxed">
          Here is a complete inventory of every category of data AgentsID collects, why we collect it, and its legal basis under GDPR.
        </p>

        <div className="overflow-x-auto mb-5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">Category</th>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">What specifically</th>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">Why</th>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">GDPR basis</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Account data</strong></td>
                <td className="p-3 border border-border align-top">Email address, display name (if provided), authentication method (email/password or OAuth provider)</td>
                <td className="p-3 border border-border align-top">To create and manage your account, send transactional emails</td>
                <td className="p-3 border border-border align-top"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">Contract</span></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Project data</strong></td>
                <td className="p-3 border border-border align-top">Project names, project settings, API key hashes (never raw keys)</td>
                <td className="p-3 border border-border align-top">To associate agents and events with your projects</td>
                <td className="p-3 border border-border align-top"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">Contract</span></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Agent data</strong></td>
                <td className="p-3 border border-border align-top">Agent names, permission rules, delegation chain definitions, agent metadata</td>
                <td className="p-3 border border-border align-top">To register agents and enforce permissions at runtime</td>
                <td className="p-3 border border-border align-top"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">Contract</span></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Audit log data</strong></td>
                <td className="p-3 border border-border align-top">Tool call records, allow/deny decisions, agent IDs, timestamps, tamper-evident hash chain entries</td>
                <td className="p-3 border border-border align-top">To provide the audit trail feature; integrity and forensics for your agents</td>
                <td className="p-3 border border-border align-top"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">Contract</span></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Token metadata</strong></td>
                <td className="p-3 border border-border align-top">Token expiry, scope claims, signing metadata (no raw secrets)</td>
                <td className="p-3 border border-border align-top">HMAC token verification without storing plaintext secrets</td>
                <td className="p-3 border border-border align-top"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">Contract</span></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Analytics data</strong></td>
                <td className="p-3 border border-border align-top">Page views, button clicks, session duration, browser/OS type (via PostHog)</td>
                <td className="p-3 border border-border align-top">To understand how the product is used and improve it</td>
                <td className="p-3 border border-border align-top"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">Consent</span></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Technical / infrastructure</strong></td>
                <td className="p-3 border border-border align-top">IP addresses, request timestamps, HTTP response codes (server logs, short-lived)</td>
                <td className="p-3 border border-border align-top">Security monitoring, rate limiting, debugging</td>
                <td className="p-3 border border-border align-top"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-600/10 text-green-600">Legitimate interest</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-green-600/5 border border-border border-l-4 border-l-green-600 rounded-lg p-4 sm:p-5 text-sm leading-relaxed">
          <strong className="block mb-1.5 text-xs uppercase tracking-wider text-green-600">We do not collect</strong>
          Payment card numbers (processed by Stripe directly), raw API keys (only HMAC hashes), the content of tool calls beyond what you explicitly log via the API, or any data from your end-users&apos; sessions unless you pass it to us.
        </div>
      </section>

      {/* 3. How We Use Your Data */}
      <section className="mb-14 scroll-mt-20" id="how-we-use">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={3} /> How We Use Your Data
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">We use the data we collect for the following purposes only:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li><strong>Provide the Service.</strong> Process API requests, verify agent tokens, enforce permission rules, write and serve audit logs.</li>
          <li><strong>Account management.</strong> Send you confirmation and transactional emails (password reset, billing receipts, plan change notices, security alerts).</li>
          <li><strong>Product improvement.</strong> Analyze aggregated usage patterns — with your consent via PostHog — to prioritize what to build next.</li>
          <li><strong>Security and abuse prevention.</strong> Monitor traffic patterns to detect and block abuse, enforce rate limits, and protect platform integrity.</li>
          <li><strong>Legal obligations.</strong> Retain records as required by applicable law, respond to lawful government requests.</li>
        </ul>
        <p className="text-foreground leading-relaxed">We do not use your data for advertising, profiling, or any purpose not listed above.</p>
      </section>

      {/* 4. Cookies */}
      <section className="mb-14 scroll-mt-20" id="cookies">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={4} /> Cookies
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">AgentsID uses a minimal cookie setup. We ask for your consent before setting any non-essential cookies.</p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Essential cookies (no consent required)</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li><strong>Supabase auth session cookie</strong> — Stores your authenticated session. Required for the dashboard and API to work. Set by Supabase Auth on login; expires when your session ends or after 7 days of inactivity.</li>
        </ul>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Analytics cookies (consent required)</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li><strong>PostHog analytics cookies</strong> — Track page views, clicks, and session behavior to help us understand product usage. Only set after you accept analytics in the cookie consent banner. You can opt out at any time from your account settings or by dismissing the banner.</li>
        </ul>

        <div className="bg-background border border-border border-l-4 border-l-primary rounded-lg p-4 sm:p-5 my-5 text-sm leading-relaxed">
          <strong className="block mb-1.5 text-xs uppercase tracking-wider text-primary">Consent first</strong>
          The PostHog script does not load until you accept analytics. If you decline or ignore the banner, no analytics cookies are set and no PostHog data is sent.
        </div>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Managing cookies</h3>
        <p className="text-foreground leading-relaxed">You can clear or block cookies via your browser settings. Blocking the Supabase session cookie will require you to log in every visit.</p>
      </section>

      {/* 5. Sharing Your Data */}
      <section className="mb-14 scroll-mt-20" id="sharing">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={5} /> Sharing Your Data
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">We do not sell your data. We do not share your data with advertisers or data brokers.</p>
        <p className="mb-5 text-foreground leading-relaxed">We share data with the following service providers who help us operate AgentsID. Each is contractually bound to use your data only for the services they provide to us.</p>

        <div className="overflow-x-auto mb-5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">Provider</th>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">Role</th>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">Data shared</th>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">Location</th>
                <th className="bg-primary/10 font-bold text-left p-3 border border-border text-foreground text-xs uppercase tracking-wider">Privacy</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Supabase</strong></td>
                <td className="p-3 border border-border align-top">Authentication &amp; database</td>
                <td className="p-3 border border-border align-top">Email, password hash, session data, all project/agent/audit data</td>
                <td className="p-3 border border-border align-top">US West</td>
                <td className="p-3 border border-border align-top"><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Policy</a></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Railway</strong></td>
                <td className="p-3 border border-border align-top">Application hosting</td>
                <td className="p-3 border border-border align-top">Request/response data (in-transit), server logs</td>
                <td className="p-3 border border-border align-top">US</td>
                <td className="p-3 border border-border align-top"><a href="https://railway.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Policy</a></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>PostHog</strong></td>
                <td className="p-3 border border-border align-top">Product analytics</td>
                <td className="p-3 border border-border align-top">Page views, click events, session data (opt-in only)</td>
                <td className="p-3 border border-border align-top">US or EU (configurable)</td>
                <td className="p-3 border border-border align-top"><a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Policy</a></td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-3 border border-border align-top"><strong>Stripe</strong> <em>(when billing is active)</em></td>
                <td className="p-3 border border-border align-top">Payment processing</td>
                <td className="p-3 border border-border align-top">Name, email, payment method data. We never see raw card numbers.</td>
                <td className="p-3 border border-border align-top">US</td>
                <td className="p-3 border border-border align-top"><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Policy</a></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Other disclosures</h3>
        <p className="text-foreground leading-relaxed">We may disclose your data if required to do so by law, court order, or government authority. We will notify you of such requests to the extent permitted by law. We may also share data in connection with a merger, acquisition, or sale of all or substantially all of our assets — in which case we will notify you before your data is transferred and becomes subject to a different privacy policy.</p>
      </section>

      {/* 6. Data Retention */}
      <section className="mb-14 scroll-mt-20" id="retention">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={6} /> Data Retention
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">We keep your data for as long as your account is active or as needed to provide the Service. Here are the specific retention rules:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li><strong>Account data (email, name):</strong> Retained until you delete your account. After deletion, purged within 30 days.</li>
          <li><strong>Project and agent data:</strong> Retained until you delete the project or your account.</li>
          <li><strong>Audit logs:</strong> Retained per your plan tier — 7 days (Free), 30 days (Pro), 90 days (Enterprise). Logs are automatically purged after the retention window.</li>
          <li><strong>API key hashes:</strong> Retained until the key is rotated or the project is deleted.</li>
          <li><strong>Analytics data (PostHog):</strong> Retained for up to 1 year within PostHog&apos;s systems, subject to their retention policy.</li>
          <li><strong>Server logs:</strong> Retained for up to 30 days for security and debugging purposes, then deleted.</li>
          <li><strong>Billing records:</strong> Retained for 7 years as required by US financial regulations.</li>
        </ul>

        <div className="bg-amber-600/5 border border-border border-l-4 border-l-amber-600 rounded-lg p-4 sm:p-5 my-5 text-sm leading-relaxed">
          <strong className="block mb-1.5 text-xs uppercase tracking-wider text-amber-600">Plan downgrade</strong>
          If you downgrade from Pro to Free, your audit logs will be trimmed to the 7-day window within 30 days. Export your logs first if you need to preserve older entries.
        </div>
      </section>

      {/* 7. Security Measures */}
      <section className="mb-14 scroll-mt-20" id="security">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={7} /> Security Measures
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">We apply the following controls to protect your data:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li><strong>Encryption in transit:</strong> All communication between your browser or API client and AgentsID uses TLS 1.2 or higher.</li>
          <li><strong>HMAC token signing:</strong> Agent tokens are signed with HMAC-SHA256. The signing secret never leaves the server. Raw API keys are never stored — only their hashes.</li>
          <li><strong>Tamper-evident audit logs:</strong> Each log entry is chained to the previous via a hash, making undetected modification computationally infeasible.</li>
          <li><strong>Database access controls:</strong> Production database access is restricted by role-based policies. Application code accesses only the data necessary for each operation.</li>
          <li><strong>Supabase Row Level Security:</strong> Data isolation between projects is enforced at the database layer, not just the application layer.</li>
        </ul>
        <p className="text-foreground leading-relaxed">Despite these measures, no system is 100% secure. If you discover a security issue, please report it to <a href="mailto:privacy@agentsid.dev" className="text-primary hover:underline">privacy@agentsid.dev</a> and we will respond promptly. We will notify affected users of any material breach in accordance with applicable law.</p>
      </section>

      {/* 8. Your Rights */}
      <section className="mb-14 scroll-mt-20" id="your-rights">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={8} /> Your Rights
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">You have the following rights regarding your personal data. To exercise any of them, email <a href="mailto:privacy@agentsid.dev" className="text-primary hover:underline">privacy@agentsid.dev</a> or use the controls in your account settings.</p>

        <ul className="list-none p-0 mb-4 space-y-2">
          <li className="flex items-start gap-3 p-3 sm:p-4 border border-border rounded-lg bg-background text-sm leading-relaxed">
            <span className="text-base shrink-0 mt-0.5" aria-hidden="true">&#128065;</span>
            <div>
              <strong className="block text-sm mb-0.5">Access</strong>
              Request a copy of all personal data we hold about you. We will provide it in a machine-readable format (JSON) within 30 days.
            </div>
          </li>
          <li className="flex items-start gap-3 p-3 sm:p-4 border border-border rounded-lg bg-background text-sm leading-relaxed">
            <span className="text-base shrink-0 mt-0.5" aria-hidden="true">&#9998;</span>
            <div>
              <strong className="block text-sm mb-0.5">Correction</strong>
              Update your email or other account information at any time from your account settings.
            </div>
          </li>
          <li className="flex items-start gap-3 p-3 sm:p-4 border border-border rounded-lg bg-background text-sm leading-relaxed">
            <span className="text-base shrink-0 mt-0.5" aria-hidden="true">&#128465;</span>
            <div>
              <strong className="block text-sm mb-0.5">Deletion</strong>
              Request deletion of your account and all associated data. We will complete the deletion within 30 days, except for data we are required to retain by law (e.g., billing records).
            </div>
          </li>
          <li className="flex items-start gap-3 p-3 sm:p-4 border border-border rounded-lg bg-background text-sm leading-relaxed">
            <span className="text-base shrink-0 mt-0.5" aria-hidden="true">&#128228;</span>
            <div>
              <strong className="block text-sm mb-0.5">Export / Portability</strong>
              Export your project data, agent configurations, and audit logs at any time from the dashboard. Raw exports are available in JSON format.
            </div>
          </li>
          <li className="flex items-start gap-3 p-3 sm:p-4 border border-border rounded-lg bg-background text-sm leading-relaxed">
            <span className="text-base shrink-0 mt-0.5" aria-hidden="true">&#128683;</span>
            <div>
              <strong className="block text-sm mb-0.5">Opt-out of analytics</strong>
              Withdraw consent for PostHog analytics at any time from your account settings or by declining the cookie banner. This stops future data collection; historical data is subject to PostHog&apos;s retention.
            </div>
          </li>
          <li className="flex items-start gap-3 p-3 sm:p-4 border border-border rounded-lg bg-background text-sm leading-relaxed">
            <span className="text-base shrink-0 mt-0.5" aria-hidden="true">&#9208;</span>
            <div>
              <strong className="block text-sm mb-0.5">Object to processing</strong>
              Object to processing based on legitimate interests (e.g., server logs). We will stop unless we have compelling grounds that override your interests.
            </div>
          </li>
        </ul>

        <p className="text-foreground leading-relaxed">We will respond to all rights requests within 30 days. We may need to verify your identity before fulfilling a request.</p>
      </section>

      {/* 9. GDPR */}
      <section className="mb-14 scroll-mt-20" id="gdpr">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={9} /> GDPR (EU and UK Users)
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">If you are located in the European Union or United Kingdom, the General Data Protection Regulation (GDPR) or UK GDPR applies to our processing of your data.</p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Lawful basis for processing</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li><strong>Contract (Art. 6(1)(b)):</strong> Processing your account data, project data, agent data, audit logs, and token metadata is necessary to perform our contract with you — i.e., to provide the Service.</li>
          <li><strong>Consent (Art. 6(1)(a)):</strong> Analytics tracking via PostHog. You can withdraw consent at any time without affecting the lawfulness of prior processing.</li>
          <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> Short-lived server logs for security monitoring and abuse prevention. Our interest in protecting the platform is balanced against your privacy — these logs are retained for no more than 30 days.</li>
        </ul>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Your additional GDPR rights</h3>
        <p className="mb-4 text-foreground leading-relaxed">In addition to the rights in Section 8, you have the right to:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li><strong>Restriction of processing</strong> — Request that we restrict processing of your data while a dispute is resolved.</li>
          <li><strong>Lodge a complaint</strong> — File a complaint with your national data protection authority (e.g., the ICO in the UK, or your EU member state&apos;s supervisory authority).</li>
        </ul>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Data transfers outside the EEA/UK</h3>
        <p className="text-foreground leading-relaxed">AgentsID&apos;s infrastructure is hosted in the United States. Data transfers from the EEA or UK to the US are made under the EU-US Data Privacy Framework and/or Standard Contractual Clauses where required. Supabase and Railway maintain appropriate safeguards for these transfers.</p>
      </section>

      {/* 10. CCPA */}
      <section className="mb-14 scroll-mt-20" id="ccpa">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={10} /> CCPA (California Users)
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">If you are a California resident, the California Consumer Privacy Act (CCPA) as amended by the CPRA grants you additional rights.</p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Categories of personal information we collect</h3>
        <p className="mb-4 text-foreground leading-relaxed">We collect: identifiers (email), commercial information (billing records), internet or network activity (server logs, analytics), and professional information (project and agent configurations).</p>

        <h3 className="text-base font-bold text-foreground mt-6 mb-2.5">Your CCPA rights</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li><strong>Right to know:</strong> Request disclosure of the categories and specific pieces of personal information we have collected about you in the past 12 months.</li>
          <li><strong>Right to delete:</strong> Request deletion of your personal information, subject to legal retention requirements.</li>
          <li><strong>Right to opt-out of sale or sharing:</strong> We do not sell or share personal information for cross-context behavioral advertising. No opt-out is needed, but you may still exercise this right by emailing <a href="mailto:privacy@agentsid.dev" className="text-primary hover:underline">privacy@agentsid.dev</a>.</li>
          <li><strong>Right to correct:</strong> Request correction of inaccurate personal information.</li>
          <li><strong>Right to limit use of sensitive personal information:</strong> We do not collect sensitive personal information as defined by the CPRA (SSNs, financial account numbers, biometrics, etc.).</li>
          <li><strong>Non-discrimination:</strong> We will not discriminate against you for exercising any of these rights.</li>
        </ul>

        <p className="text-foreground leading-relaxed">To exercise CCPA rights, email <a href="mailto:privacy@agentsid.dev" className="text-primary hover:underline">privacy@agentsid.dev</a> with the subject line &quot;CCPA Request.&quot; We will respond within 45 days.</p>
      </section>

      {/* 11. Children's Privacy */}
      <section className="mb-14 scroll-mt-20" id="children">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={11} /> Children&apos;s Privacy
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">AgentsID is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have inadvertently collected data from a child under 13, we will delete it promptly.</p>
        <p className="text-foreground leading-relaxed">If you believe we have collected information from a child under 13, contact us at <a href="mailto:privacy@agentsid.dev" className="text-primary hover:underline">privacy@agentsid.dev</a>.</p>
      </section>

      {/* 12. International Transfers */}
      <section className="mb-14 scroll-mt-20" id="transfers">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={12} /> International Transfers
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">AgentsID is operated from the United States. Our primary database (Supabase) is hosted in <strong>US West (Oregon)</strong>. Our application servers (Railway) are hosted in the <strong>United States</strong>.</p>
        <p className="mb-4 text-foreground leading-relaxed">If you access the Service from outside the United States, your data will be transferred to and processed in the United States. US privacy laws may differ from those in your jurisdiction. By using the Service, you acknowledge this transfer.</p>
        <p className="text-foreground leading-relaxed">For EU/EEA and UK users, we rely on the EU-US Data Privacy Framework and Standard Contractual Clauses to provide appropriate safeguards for cross-border data transfers.</p>
      </section>

      {/* 13. Policy Changes */}
      <section className="mb-14 scroll-mt-20" id="changes">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={13} /> Policy Changes
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">We may update this Privacy Policy from time to time. When we make material changes (changes that affect what data we collect, how we use it, or your rights), we will:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li>Update the &quot;Last updated&quot; date at the top of this page</li>
          <li>Send an email notification to the address on your account at least 14 days before changes take effect</li>
        </ul>
        <p className="mb-4 text-foreground leading-relaxed">Minor changes (clarifications, formatting, corrections that don&apos;t affect your rights) may be made without individual notification.</p>
        <p className="text-foreground leading-relaxed">Your continued use of the Service after a material change takes effect constitutes acceptance of the updated policy.</p>
      </section>

      {/* 14. Contact */}
      <section className="scroll-mt-20" id="contact">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border">
          <SectionNumber num={14} /> Contact
        </h2>
        <p className="mb-4 text-foreground leading-relaxed">For privacy inquiries, data rights requests, or concerns about this policy:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground leading-relaxed">
          <li>Email: <a href="mailto:privacy@agentsid.dev" className="text-primary hover:underline">privacy@agentsid.dev</a></li>
          <li>Website: <a href="https://agentsid.dev" className="text-primary hover:underline">agentsid.dev</a></li>
        </ul>
        <p className="text-foreground leading-relaxed">We aim to respond to all privacy inquiries within 5 business days, and to fulfill data rights requests within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.</p>
      </section>
    </article>
  );
};

export { Privacy };
