#!/bin/bash
# Quick in-house analytics queries (CloudWatch Logs Insights over the Lambda's logs).
#   scripts/analytics.sh daily [days]     per-puzzle funnel: views, listened, solved, failed
#   scripts/analytics.sh guesses [days]   most common wrong guesses per puzzle
#   scripts/analytics.sh events [days]    event counts and unique devices
#   scripts/analytics.sh raw [days]       last 50 raw events
# Production only: events from dev hosts, dev devices (?dev=1) and the mock API are excluded.
set -euo pipefail
WHAT=${1:-events}; DAYS=${2:-7}
export AWS_PROFILE=${AWS_PROFILE:-enohp}
GROUP=/aws/lambda/enohp
BASE='fields @message | filter @message like /"t":"evt"/ | parse @message /(?<json>\{"t":"evt".*\})/
| filter json not like /"dev":true/ and json like /"host":"(www\.)?yelnatsgame\.com"/'
case "$WHAT" in
  daily) Q="$BASE | parse json /\"name\":\"(?<name>[a-z_]+)\"/ | parse json /\"puzzle\":(?<puzzle>[0-9]+)/
    | filter name in ['daily_view','daily_listened','daily_solved','daily_failed']
    | stats count_distinct(json) as events by puzzle, name | sort puzzle desc" ;;
  guesses) Q="$BASE | filter json like /\"name\":\"guess\"/ and json like /\"correct\":false/
    | parse json /\"puzzle\":(?<puzzle>[0-9]+)/ | parse json /\"text\":\"(?<text>[^\"]*)\"/
    | stats count(*) as times by puzzle, text | sort puzzle desc, times desc | limit 100" ;;
  events) Q="$BASE | parse json /\"name\":\"(?<name>[a-z_]+)\"/ | parse json /\"device\":\"(?<device>[^\"]+)\"/
    | stats count(*) as events, count_distinct(device) as devices by name | sort events desc" ;;
  raw) Q="$BASE | sort @timestamp desc | limit 50" ;;
  *) echo "usage: $0 daily|guesses|events|raw [days]"; exit 1 ;;
esac
START=$(( $(date +%s) - DAYS * 86400 )); END=$(date +%s)
ID=$(aws logs start-query --region us-east-1 --log-group-name "$GROUP" --start-time $START --end-time $END --query-string "$Q" --query queryId --output text)
for i in $(seq 1 30); do
  OUT=$(aws logs get-query-results --region us-east-1 --query-id "$ID" --output json)
  STATUS=$(echo "$OUT" | python3 -c 'import sys, json; print(json.load(sys.stdin)["status"])')
  [ "$STATUS" = Complete ] && break
  sleep 2
done
echo "$OUT" | python3 -c '
import sys, json
rows = json.load(sys.stdin)["results"]
for r in rows:
    print("  ".join("%s=%s" % (c["field"], c["value"]) for c in r if not c["field"].startswith("@")))
print("(%d rows)" % len(rows))'
