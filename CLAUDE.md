# Project Guidelines for Claude

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
