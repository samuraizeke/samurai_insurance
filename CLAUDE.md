# Project Guidelines for Claude

## Debugging Permissions

Claude has permission to freely use chrome-devtools MCP to:
- Check console logs and errors
- Inspect network requests/responses
- Take screenshots when debugging UI issues
- Check application state

Claude should proactively use these tools when debugging without asking for permission.

## Bash Commands Permissions

Claude has permission to run bash commands freely without asking for permission.

## Supabase MCP Permissions

Claude has permission to freely use Supabase MCP server tools to:
- Execute SELECT queries
- List tables, projects, organizations, and branches
- Get project details and configurations
- Check database logs and advisors
- Generate TypeScript types
- List and read Edge Functions

**Requires Permission:**
- Changing database schema (DDL operations like CREATE, ALTER, DROP)
- Applying migrations
- Creating/deleting projects or branches
- Deploying Edge Functions

Claude should proactively use read-only Supabase tools when needed without asking for permission.

## Tailwind CSS (v4)

Use Tailwind v4 canonical syntax. Prefer built-in utilities over arbitrary values.

### Font Families
```
font-(family-name:--font-work-sans)    # correct
font-[family-name:var(--font-work-sans)]  # avoid
```

### CSS Variables
```
bg-(--background)     # correct
bg-[var(--background)]   # avoid
```

### Z-Index
```
z-10000      # correct
z-[10000]    # avoid
```

### Spacing
Use the spacing scale instead of arbitrary pixel values:
```
mt-0.5, -ml-0.5    # correct (0.5 = 2px)
mt-[2px], ml-[-2px]   # avoid
```

### Flex Values
```
flex-2       # correct
flex-[2]     # avoid
```

### Letter Spacing
Use semantic classes when available:
```
tracking-widest     # correct
tracking-[0.1em]    # avoid
```

### Radix UI Variables
```
w-(--radix-dropdown-menu-trigger-width)    # correct
w-[var(--radix-dropdown-menu-trigger-width)]  # avoid
```
