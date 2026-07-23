# Eval results

Generated: 2026-07-23T22:30:51.677Z
Mode: live+offline

| Metric | Value |
|--------|------:|
| Cases in suite | 32 |
| Ran | 32 |
| Passed | 32/32 |
| Pass rate | 100.0% |
| Citation rate (substantive) | 100.0% |

Target: **100% of substantive answers include a live EDGAR URL**.

## Case detail

| ID | Kind | Result | Detail |
|----|------|--------|--------|
| cite-01 | citation_url | pass | url valid=true |
| cite-02 | citation_url | pass | url valid=true |
| cite-03 | citation_url | pass | url valid=false |
| cite-04 | citation_url | pass | url valid=false |
| diff-01 | diff_synthetic | pass | changes=2 |
| diff-02 | diff_synthetic | pass | changes=2 |
| diff-03 | diff_synthetic | pass | changes=0 |
| sec-01 | section_extract | pass | len=107 |
| sec-02 | section_extract | pass | len=180 |
| ground-01 | ground_synthetic | pass | hits=1 |
| ground-02 | ground_synthetic | pass | hits=0 |
| meth-01 | methodology | pass | 0.1.0 |
| diff-04 | diff_synthetic | pass | changes=1 |
| diff-05 | diff_synthetic | pass | changes=2 |
| sec-03 | section_extract | pass | len=183 |
| ground-03 | ground_synthetic | pass | hits=1 |
| cite-05 | citation_url | pass | url valid=true |
| meth-02 | methodology | pass | 0.1.0 |
| diff-06 | diff_synthetic | pass | changes=2 |
| sec-04 | section_extract | pass | len=117 |
| live-diff-aapl-1a | live_diff | pass | changes=16 newer=2025-10-31 |
| live-diff-msft-1a | live_diff | pass | changes=25 newer=2025-07-30 |
| live-diff-nvda-1a | live_diff | pass | changes=25 newer=2026-02-25 |
| live-diff-aapl-7 | live_diff | pass | changes=25 newer=2025-10-31 |
| live-ground-aapl | live_ground | pass | verdict=supported evidence=5 |
| live-ground-msft | live_ground | pass | verdict=supported evidence=5 |
| live-events-aapl | live_events | pass | events=3 |
| live-events-multi | live_events | pass | events=6 |
| live-peers-semi | live_peers | pass | themes=8 |
| live-peers-tech | live_peers | pass | themes=8 |
| live-diff-googl-1a | live_diff | pass | changes=25 newer=2026-02-05 |
| live-diff-amzn-1a | live_diff | pass | changes=12 newer=2026-02-06 |
