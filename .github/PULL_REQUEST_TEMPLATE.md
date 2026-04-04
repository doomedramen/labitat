## Description

Brief description of changes. What does this PR do? Why is it needed?

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] New service adapter
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional change)

## Related Issues

Closes #

## Testing

How did you test this change?

- [ ] Tested locally with `pnpm dev`
- [ ] Ran `pnpm lint && pnpm typecheck && pnpm build`
- [ ] Tested with Docker build
- [ ] Added/updated E2E tests

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation (if applicable)
- [ ] My changes generate no new warnings
- [ ] For new service adapters:
  - [ ] `id` is lowercase, hyphen-separated, unique
  - [ ] `icon` matches a slug from [selfh.st/icons](https://selfh.st/icons)
  - [ ] All sensitive fields use `type: 'password'` (auto-encrypted)
  - [ ] `fetchData` throws descriptive errors on failure
  - [ ] Widget handles loading/error states gracefully
