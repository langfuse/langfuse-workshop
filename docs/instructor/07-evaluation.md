# 07 Evaluate a Change

Learner guide: [07 Evaluate a Change](../learner/07-evaluation.md)

## Instructor notes

- Make learners inspect run 1 before changing anything. The change should respond to evidence, not vibes.
- Keep the iteration deliberately small: one prompt rule, one rerun, one comparison.
- Emphasize regressions. The most useful comparison is often the item that got worse.

## Demo rhythm

1. Read low-scoring items from the first run.
2. Add or promote a new prompt version.
3. Run `npm run dataset:run` again.
4. Compare both runs side by side and decide whether the change is worth shipping.

## Watch for

- Learners changing both model and prompt at the same time, making the comparison hard to interpret.
- New prompt versions that are saved but not promoted to the label the app fetches.
