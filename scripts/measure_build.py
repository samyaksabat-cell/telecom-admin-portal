"""Time a build, retain machine-readable metrics, and compare with main in CI."""

import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
import time


def download_baseline(component):
    """Only successful main CI runs are baselines; missing history is non-fatal."""
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return None
    try:
        runs = subprocess.run(
            [
                "gh", "run", "list", "--repo", os.environ["GITHUB_REPOSITORY"],
                "--workflow", "ci.yml", "--branch", "main", "--status", "success",
                "--limit", "1", "--json", "databaseId",
            ],
            check=True, capture_output=True, text=True, timeout=30,
        )
        run_id = json.loads(runs.stdout)[0]["databaseId"]
        with tempfile.TemporaryDirectory() as directory:
            subprocess.run(
                [
                    "gh", "run", "download", str(run_id),
                    "--repo", os.environ["GITHUB_REPOSITORY"],
                    "--name", f"{component}-build-performance", "--dir", directory,
                ],
                check=True, capture_output=True, text=True, timeout=30,
            )
            return json.loads((Path(directory) / "metrics.json").read_text())
    except (OSError, subprocess.SubprocessError, ValueError, KeyError, IndexError):
        print("No baseline available (first run, expired artifact, or API unavailable).")
        return None


def comparison(current, baseline):
    if not isinstance(baseline, dict):
        return None
    for key in ("schema_version", "component", "command", "runner_os", "runner_arch"):
        if baseline.get(key) != current[key]:
            return None
    duration = baseline.get("duration_seconds")
    if (
        baseline.get("exit_code") != 0
        or current["exit_code"] != 0
        or not isinstance(duration, (int, float))
        or not math.isfinite(duration)
        or duration <= 0
    ):
        return None
    delta = current["duration_seconds"] - duration
    percent = delta / duration * 100
    return {
        "baseline_seconds": duration,
        "baseline_commit": baseline.get("commit"),
        "delta_seconds": round(delta, 3),
        "delta_percent": round(percent, 2),
        # Both thresholds reduce noise on shared runners and very short builds.
        "regression": delta > 10 and percent > 20,
    }


def measure(component, command, output, cwd=None):
    baseline = download_baseline(component)
    started_at = datetime.now(timezone.utc).isoformat()
    start = time.perf_counter()
    try:
        code = subprocess.run(command, cwd=cwd, check=False).returncode
        if code < 0:
            code = 128 - code
    except OSError as error:
        print(f"Unable to start build: {error}")
        code = 127
    metrics = {
        "schema_version": 1,
        "component": component,
        "command": command,
        "started_at": started_at,
        "duration_seconds": round(time.perf_counter() - start, 3),
        "exit_code": code,
        "commit": os.environ.get("GITHUB_SHA"),
        "ref": os.environ.get("GITHUB_REF"),
        "run_id": os.environ.get("GITHUB_RUN_ID"),
        "run_attempt": os.environ.get("GITHUB_RUN_ATTEMPT"),
        "runner_os": os.environ.get("RUNNER_OS"),
        "runner_arch": os.environ.get("RUNNER_ARCH"),
        "cache_hit": os.environ.get("BUILD_CACHE_HIT", "unknown"),
    }
    metrics["comparison"] = comparison(metrics, baseline)
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(metrics, indent=2) + "\n")
    report = (
        f"### {component.title()} build performance\n\n"
        f"- Duration: {metrics['duration_seconds']:.3f}s\n"
        f"- Exit code: {code}\n"
        f"- Build cache hit: {metrics['cache_hit']}\n"
    )
    trend = metrics["comparison"]
    if trend:
        report += (
            f"- Latest successful main: {trend['baseline_seconds']:.3f}s\n"
            f"- Change: {trend['delta_seconds']:+.3f}s "
            f"({trend['delta_percent']:+.2f}%)\n"
        )
        if trend["regression"]:
            print(f"::warning title=Build performance regression::{component} build "
                  f"is {trend['delta_percent']:.2f}% slower "
                  f"(+{trend['delta_seconds']:.3f}s) than main.")
    else:
        report += "- No comparable successful main baseline available.\n"
    print(report)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            summary.write(report + "\n")
    return code


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--component", choices=("frontend", "backend"), required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--cwd")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("a build command is required after --")
    raise SystemExit(measure(args.component, command, args.output, args.cwd))
