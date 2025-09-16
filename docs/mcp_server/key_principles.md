Key principles extracted for building Tools and MCP Servers for Agents: 

- Consolidate workflows: Implement `schedule_event` instead of separate `list_users`, `get_availability`, and `create_event` tools.

- Evaluate with real tasks: Test with goals like "find the project lead and schedule a meeting," not just "get user."

- Automate metrics: Programmatically run evaluations to track success rates, token counts, and tool call frequency.

- Let AI refactor: Feed failed evaluation transcripts to an LLM to get suggestions for improving your tool's code.

- Namespace tools clearly: Use prefixes to differentiate tools, such as `jira_search_issues` vs. `github_search_issues`.

- Return meaningful context: Prefer human-readable names like "Jane Doe" instead of cryptic `usr_7a3b4c9` IDs.

- Enforce token efficiency: Implement pagination and filtering for tools that can return long lists of results.

- Make errors helpful: Instead of `Invalid input`, return `Error: Missing 'user_id'. Example: search(user_id=12345)`.

- Guide with messages: If output is cut, guide with "Showing 10 of 100 results. Use the 'page' parameter for more."

- Use unambiguous parameter names: Use `user_email` or `user_id` instead of a generic `user` parameter.

- Define formats explicitly: In parameter descriptions, specify requirements like "Date must be in YYYY-MM-DD format."

- Provide examples in descriptions: Add an `Example: search_query='status:open'` to the parameter's help text.