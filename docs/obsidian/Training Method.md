# Training Method

## Purpose

This page explains the training philosophy behind HIIT Master. It is important because the app’s timing behavior only makes sense if the athlete understands the underlying method.

## Core idea

The app is designed around an aspirational `Nominal Work Period` and an adjustable `Actual Work Duration`.

- The `Nominal Work Period` is the target work interval the athlete is ultimately trying to achieve.
- The `Actual Work Duration` is the work interval the athlete chooses for the session they are performing today.

The app assumes the athlete may need weeks or months of training before they can consistently complete sessions at the nominal target.

## Fixed and variable training parameters

The athlete will typically choose several workout parameters for personal comfort and then hold them constant during a training block.

Examples include:

- speed
- resistance
- incline

These parameters are intentionally not the app’s main adaptive variable.

The remaining meaningful effort variable is the actual work duration.

## Why actual work duration can differ from nominal work period

The app is designed so the athlete can train below the nominal target without making the session structure meaningless.

Required behavior:

- If the athlete reduces the actual work duration below the nominal work period, each second removed from work is added to each recovery period.
- This keeps the total round length fixed.

Design intent:

- Sessions remain structurally comparable even while the athlete is still building toward the target workload.

## Why this matters

This approach lets the athlete:

- train at a realistic level today
- avoid excessive exhaustion
- keep workout structure comparable across sessions
- progressively move back toward the nominal target over time

The aim is to reduce the risk of discouragement or demotivation caused by repeatedly attempting an unrealistic target.

## Practical training recommendation

When returning from injury, sickness, or detraining, the athlete should start from a realistic point rather than trying to resume the nominal target immediately.

Practical guidance:

- starting around two thirds of the nominal work period is often a manageable re-entry point

This is intentionally easier than the aspirational target.

## How recovery comparison fits the method

The recovery delta graphs are intended to help the athlete assess how well they are recovering within a fixed session structure.

That interpretation is strongest when:

- the same profile is used
- the same external training parameters are kept fixed
- the athlete is progressively moving actual work duration toward the nominal target

## Profile selection

The app may contain several profiles, for example for different equipment such as:

- treadmill
- elliptical
- bike

In practice, an athlete will usually train against one profile for a long period and only change infrequently.

Required terminology:

- `Profile`: a workout definition
- `Selected Profile`: the profile that will be used for upcoming sessions
- `My Profile`: the starter profile shipped with the app

Design intent:

- `Selected Profile` is clearer than `Default Profile` or `Active Profile`
- it reflects that the athlete has intentionally chosen the profile they are currently training against

## Rebuild implications

The rebuild should preserve the distinction between:

- profile-level nominal timing
- session-level actual work duration

This distinction is core to the product and should not be treated as a minor UI option.

## Related pages

- [[Home]]
- [[Domain Model]]
- [[Comparison & Recovery Rules]]
