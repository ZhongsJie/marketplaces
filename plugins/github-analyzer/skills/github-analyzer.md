# GitHub Analyzer Skill

This skill helps you analyze GitHub repository issues, pull requests, workflows, and code using the `gh` CLI.

## When This Skill Activates

This skill activates when users want to analyze GitHub issues, PRs, repository activity, workflows, or search for code. Examples include:
- Summarizing open issues
- Listing recent pull requests
- Finding stale or old issues
- Analyzing PR changes and code reviews
- Checking repository activity
- Searching for specific code or files across the repository
- Analyzing CI/CD workflow runs
- Getting repository statistics

DO NOT activate when: the request is unrelated to GitHub analysis.

## gh CLI Patterns

### Repository Context
- `gh repo view` - View current repository information
- `gh repo view [owner]/[repo]` - View specific repository

### Issues
- `gh issue list` - List issues in the current repository
- `gh issue list --state open` - List only open issues
- `gh issue list --state closed` - List closed issues
- `gh issue list --label "bug"` - Filter by label
- `gh issue list --assignee @me` - Filter by assignee
- `gh issue list --search "created:2024-01-01..2024-12-31"` - Search by date
- `gh issue view [number]` - View individual issue details
- `gh issue view [number] --comments` - Include comments

### Pull Requests
- `gh pr list` - List PRs in the current repository
- `gh pr list --state open` - List only open PRs
- `gh pr list --state merged` - List merged PRs
- `gh pr list --label "review"` - Filter by label
- `gh pr view [number]` - View PR details
- `gh pr view [number] --comments` - Include review comments
- `gh pr diff [number]` - Get PR changes/diff
- `gh pr checks [number]` - Show PR check status

### GitHub Search
Use `gh search` for advanced searching across issues, PRs, code, and repositories:

#### Search Issues
```bash
# Find issues containing specific keywords
gh search issues "login bug" --owner myorg

# Find issues in a repo created in the last 7 days
gh search issues --repo owner/repo --created "2024-01-01..2024-12-31" --limit 20

# Find issues with many comments (likely important)
gh search issues "bug" --sort comments --limit 10
```

#### Search PRs
```bash
# Find PRs that mention a specific reviewer
gh search prs "reviewer:@me" --repo owner/repo

# Find recently updated PRs touching specific files
gh search prs "filename:.go" --repo owner/repo --sort updated
```

#### Search Code
```bash
# Search for code patterns in a repo
gh search code "function authenticate" --repo owner/repo

# Search with language filter
gh search code "TODO" --language python --repo owner/repo

# Search excluding test files
gh search code "TODO" --repo owner/repo --exclude "**/*_test.go"
```

#### Search Repositories
```bash
# Find repos matching a topic
gh search repos "machine-learning" --limit 10

# Find repos with more than 1000 stars
gh search repos "topic:api" --sort stars --limit 10
```

### GitHub API
Use `gh api` for direct API access when `gh` commands don't cover your needs:

```bash
# Get raw JSON response for custom queries
gh api repos/owner/repo

# Get specific endpoint
gh api repos/owner/repo/contents/path/to/file

# Use GraphQL
gh api graphql -f query='{viewer{login}}'

# Pass custom headers
gh api repos/owner/repo --header "Accept: application/vnd.github.v3+json"

# Get commit history with pagination
gh api repos/owner/repo/commits --page 1 --per_page 100

# Search with API (more flexible than gh search)
gh api search/issues?q=is:issue+label:bug+repo:owner/repo

# Get repository statistics
gh api repos/owner/repo/stats/contributors

# List all branches
gh api repos/owner/repo/branches

# Get workflow runs
gh api repos/owner/repo/actions/runs
```

### Workflows and CI/CD

#### List Workflows
```bash
# List all workflows in a repo
gh workflow list

# View a specific workflow
gh workflow view [workflow-id or filename]
```

#### Workflow Runs
```bash
# List recent workflow runs
gh run list

# List runs for a specific workflow
gh run list --workflow [workflow-name]

# View run details
gh run view [run-id]

# View run logs (downloads as zip)
gh run download [run-id]

# Stream live logs from a running workflow
gh run watch [run-id]

# Rerun a workflow
gh run rerun [run-id]

# Cancel a running workflow
gh run cancel [run-id]
```

#### Analyzing Workflow Failures
```bash
# View failed run with logs
gh run view [run-id] --log

# Get just the failed job
gh run view [run-id] --job | grep -A 10 "failure"

# Check annotation details
gh run view [run-id] --annotation

# Compare with previous successful run
gh run list --status success --limit 2
```

## Pagination Guidance

When dealing with large datasets, use pagination to avoid rate limits:

### Limit Results
```bash
# Most list commands support --limit
gh issue list --limit 100
gh pr list --limit 50
gh run list --limit 20
```

### API Pagination
```bash
# Use --page and --per_page flags
gh api repos/owner/repo/issues --page 1 --per_page 100
gh api repos/owner/repo/issues --page 2 --per_page 100

# Loop through all pages in a script
for page in $(seq 1 10); do
  gh api "repos/owner/repo/issues?page=$page&per_page=100" | jq '.[]'
done
```

### Handle Large Outputs
```bash
# Use --jq to extract only needed fields (reduces output size)
gh issue list --jq '.[] | {number, title, labels: .labels[].name}'

# Output to file for later analysis
gh issue list --json number,title,labels > issues.json

# Filter with grep-friendly output
gh issue list --json number,title -q '.[] | "\(.number) \(.title)"'
```

### Rate Limit Awareness
```bash
# Check current rate limit
gh api rate_limit

# See remaining calls in the response header
gh api repos/owner/repo -I | grep -i x-ratelimit-remaining
```

## Common Analysis Patterns

### Summarizing Issue Threads
1. Use `gh issue list --state open` to get open issues
2. For each relevant issue, use `gh issue view [number]` to get details
3. Compile a summary with: issue number, title, labels, assignee, and creation date

### Finding Stale Issues
```bash
gh issue list --state open --sort updated --reverse
```
Then analyze issues that haven't been updated in a while (e.g., 30+ days).

### Categorizing by Labels
```bash
gh issue list --label "bug"
gh issue list --label "enhancement"
gh issue list --label "documentation"
```

### PR Size/Complexity Analysis
```bash
gh pr view [number]
gh pr diff [number] --stat  # Get change statistics
```
- Small PR: < 100 lines changed
- Medium PR: 100-500 lines changed
- Large PR: > 500 lines changed

### Reviewer Assignment Suggestions
1. Check `gh pr view [number]` for the author
2. Look at recent PRs from the same author using `gh pr list --author [username]`
3. Consider CODEOWNERS file if present in the repo

## Error Handling

### Authentication Errors
If you encounter auth errors:
- Run `gh auth status` to check authentication
- Use `gh auth login` to re-authenticate

### Rate Limiting
- GitHub API has rate limits; use `--jq` flag to reduce output
- Check rate limit with `gh api rate_limit`

### Repository Not Found
- Ensure you're in a git repository with a GitHub remote
- Or specify the full repository: `gh issue list --repo owner/repo`

## Usage Examples

### Issues & PRs
1. **List all open issues**: `gh issue list --state open`
2. **Show latest 5 PRs**: `gh pr list --limit 5`
3. **Find bugs needing triage**: `gh issue list --label "bug" --state open`
4. **View PR #123 diff**: `gh pr diff 123`
5. **Get issue with comments**: `gh issue view 45 --comments`

### Search
6. **Find issues about authentication across org**: `gh search issues "authentication" --owner myorg --limit 20`
7. **Search code for specific function**: `gh search code "function parseConfig" --repo owner/repo`
8. **Find popular Python repos**: `gh search repos "language:python" --sort stars --limit 10`

### Workflows & CI/CD
9. **View failing workflow runs**: `gh run list --status failure`
10. **Watch live workflow progress**: `gh run watch [run-id]`
11. **View workflow failure logs**: `gh run view [run-id] --log`
12. **List all workflows**: `gh workflow list`

### API & Advanced
13. **Get repository stats**: `gh api repos/owner/repo/stats/contributors`
14. **Export issues to JSON**: `gh issue list --json number,title,labels,state > issues.json`
15. **Find high-comment issues**: `gh search issues "is:issue" --sort comments --limit 10`
16. **Check rate limit**: `gh api rate_limit`