<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep theme state in the shared ThemeProvider and apply the root dark class; all pages reuse semantic CSS tokens and the preference survives navigation and refresh.
- Analytics are first-party and consent-gated via src/lib/analytics.ts track(); never send PII or form contents, and never call it before consent. Why: privacy requirements.
- Keep one CartProvider for all cart consumers; guests persist locally and merge into existing authenticated cart rows on sign-in, so badges and pages share mutation state.
- Keep /cart public and checkout protected; guest customers can review items before signing in to place an order.
- Below the existing md breakpoint, reserve safe-area-aware space for bottom navigation and position purchase controls above it; desktop navigation stays unchanged.
