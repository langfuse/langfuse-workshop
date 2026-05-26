# 00 Setup

Learner guide: [00 Setup](../learner/00-setup.md)

## Instructor notes

- Use `checkpoint/00-setup` as the stable complete-app checkout. This chapter is an environment check, not a coding exercise.
- `main` also contains the complete reference implementation, but learners should use the checkpoint so setup has the same reviewable baseline convention as the rest of the workshop.
- Make learners confirm both URLs: Vite on `127.0.0.1:3333`, Express on `127.0.0.1:8787`.
- Emphasize the EU Langfuse host value: `LANGFUSE_BASE_URL=https://cloud.langfuse.com`.
- After one successful chat turn, have learners switch to `checkpoint/02-tracing` for the first build step.

## Watch for

- Missing `.env` values. The app may render while model calls fail.
- People staying on `checkpoint/00-setup` or `main` for tracing. Both are already the finished reference implementation.
