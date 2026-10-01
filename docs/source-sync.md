# Source synchronization

`release/extraction.json` pins the source revision and package scope; `release/public-source.json` is the reviewed public file inventory. Maintain internal implementation and public distribution adaptations separately. Do not configure the internal repository as a mergeable upstream or cherry-pick internal commits into public history.

## Generate candidates

Run the following from this repository. The source repository must contain both the recorded baseline and the target revision. The output directory must not exist and must be outside both repositories.

```bash
node scripts/prepare-source-sync.mjs --source /path/to/source-repository \
  --ref <reviewed-upstream-commit> --out /path/to/new-private-review-directory
```

The tool reads Git objects, not the source working tree or credentials. For source files in the public inventory, it compares the old source, target source, and current public version to produce three-way merge candidates that preserve public changes. Conflicts keep their markers; deletions are reported without deleting files. New upstream files are reported by path and require separate review before inclusion. Selecting a revision does not automatically advance the recorded baseline.

Output includes `report.json`, `candidates/`, and `.private-review`. Candidates are **unreviewed internal material**: do not upload them directly to GitHub, attach them to a PR, or copy the entire directory into the public repository. The tool never changes the current repository, runs upstream scripts, or carries internal commit authors, messages, or history.

## Review and apply

1. Inspect conflicts, deletions, new files, non-regular files, and missing source files. Include new files only when actual dependencies require them; do not recursively copy whole packages.
2. Review internal addresses, generated IDL, credentials, prompt / asset licenses, and service contracts. Preserve in-process boundaries and public environment configuration.
3. Apply approved files individually to a public feature branch. Resolve all conflicts, then update `sourceRevision` in `release/extraction.json` to the report's `targetRevision`. Do not advance the baseline before reviewing all differences.
4. Regenerate the dependency license inventory if dependencies changed, then review and update the public source inventory. Run source, standalone, type, build, and explicitly selected affected tests.
5. Scan complete history and current source before creating the public PR. Include public changes, validation results, and capability descriptions, never private review reports.

After accepted public changes are ported back, subsequent three-way comparisons should show them as synchronized or cleanly mergeable while retaining standalone adaptations. Synchronization is not a blind overwrite: conflicts, missing source, and new files require maintainer judgment.

## Selective release updates

A bounded release update can port reviewed behavior without adopting unrelated
runtime ownership migrations or private service integrations. Keep the existing
three-way baseline until the entire target revision has been reviewed; record
the selected revision, included behavior and excluded boundaries separately.
See the [0.5.5 review](source-sync-0.5.5.md) for the current selective update.


## Talos branch ownership

`origin/main` is the single Talos product branch. Work on short-lived feature, fix, or documentation branches; integrate accepted work into main before declaring delivery complete, unless the owner explicitly requested a draft branch. Delete a work branch only after confirming its commits are reachable from main. Published-version tags identify exact source commits and must not move.

`upstream` refers only to the official public MiniMax Code repository. It is a read-only source of candidates, not a second Talos development branch. Select public PRs explicitly in separate sync work; do not merge the entire upstream main by default. A standalone public commit may be cherry-picked with source attribution after reviewing dependencies; adapted changes must record their original PR/commit and any omitted prerequisites. The internal-to-public extraction contract above remains separate: do not change extraction sourceRevision merely because a public PR was selected.

### Initial main promotion (2026-10-01)

The owner authorized promoting the accepted Talos development tree to main without importing upstream PRs. Preserve the former remote main at tag `backup/upstream-main-20261001` (c593d3d52c2544faeed1753a486434739b741bd3); rename the old remote branch temporarily, promote the Talos branch, then remove the temporary branch after verifying the tag. This is a branch-name transition, not an upstream merge.

The following former-main commits remain deferred, not integrated or rejected: c593d3d (#381), e3d7855 (#380), ec4a611 (#379), c7935eb (#378), 3ba8169 (#376). Review them only in a separately authorized sync task. The tag preserves their history. Tag `v0.1.0` identifies the published source commit 63bd98ee0d7500f9c172718fb65c125e54e35014, not the later README commit.


## Selected public PR intake (2026-10-02)

Owner-approved scope: #199 (bf3916f57f5497c89c0ec4cb7006b51ca4ed3ea3), #388 (67a5c2ac522627d03a15f5f52824772b7512d7d5), and only literal user-text presentation from #410 (56834658777bdca51ca8778f389d84aaec8da2ac), all from MiniMax-AI/minimax-code. Patches retain upstream authorship in the public Git history and commit attribution.

#410 stale-run watchdog, lifecycle observation, and its associated tests are excluded. Talos branding, model defaults, permissions, data directories and version remain unchanged. Source/test inventories are regenerated locally; extraction sourceRevision is not advanced by this selective public intake. Other candidates remain discussion items in the companion product docs, not approved work.
