import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import measure_build


class BuildMetricsTest(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            "GITHUB_ACTIONS": "false", "GITHUB_STEP_SUMMARY": "",
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_real_command_timing_summary_and_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "nested/metrics.json"
            summary = Path(directory) / "summary.md"
            with patch.dict(os.environ, {
                "GITHUB_STEP_SUMMARY": str(summary),
                "GITHUB_SHA": "test-commit", "BUILD_CACHE_HIT": "true",
            }):
                result = measure_build.measure(
                    "frontend", [
                        sys.executable, "-c",
                        "import os, sys, time; assert os.getcwd() == sys.argv[1]; time.sleep(0.05)",
                        directory,
                    ],
                    output, directory,
                )
            metrics = json.loads(output.read_text())
            self.assertEqual(result, 0)
            self.assertGreaterEqual(metrics["duration_seconds"], 0.05)
            self.assertEqual(metrics["commit"], "test-commit")
            self.assertEqual(metrics["cache_hit"], "true")
            self.assertIn("No comparable", summary.read_text())

    def test_cli_preserves_failure_and_records_metrics(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "metrics.json"
            result = subprocess.run([
                sys.executable, str(Path(measure_build.__file__)),
                "--component", "backend", "--output", str(output), "--",
                sys.executable, "-c", "raise SystemExit(23)",
            ], check=False)
            self.assertEqual(result.returncode, 23)
            self.assertEqual(json.loads(output.read_text())["exit_code"], 23)

    def test_missing_command_is_recorded_as_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "metrics.json"
            code = measure_build.measure("frontend", [directory + "/missing"], output)
            self.assertEqual(code, 127)
            self.assertEqual(json.loads(output.read_text())["exit_code"], 127)

    def metrics(self, duration=100, **overrides):
        return {
            "schema_version": 1, "component": "frontend", "command": ["pnpm", "build"],
            "runner_os": "Linux", "runner_arch": "X64",
            "exit_code": 0, "duration_seconds": duration, **overrides,
        }

    def test_regression_requires_both_thresholds(self):
        for current, baseline, expected in [
            (130, 100, True), (120, 100, False),
            (11, 1, False), (200, 190, False), (80, 100, False),
        ]:
            with self.subTest(current=current, baseline=baseline):
                trend = measure_build.comparison(self.metrics(current), self.metrics(baseline))
                self.assertEqual(trend["regression"], expected)

    def test_invalid_or_incompatible_baselines_are_not_compared(self):
        for baseline in [
            None, [], {}, self.metrics(0), self.metrics(-1),
            self.metrics(float("nan")), self.metrics(float("inf")),
            self.metrics("100"), self.metrics(exit_code=1),
            self.metrics(component="backend"), self.metrics(command=["other"]),
            self.metrics(schema_version=2), self.metrics(runner_os="Windows"),
            self.metrics(runner_arch="ARM64"),
        ]:
            with self.subTest(baseline=baseline):
                self.assertIsNone(measure_build.comparison(self.metrics(), baseline))
        self.assertIsNone(measure_build.comparison(self.metrics(exit_code=1), self.metrics()))

    def test_downloads_latest_successful_main_artifact(self):
        baseline = self.metrics()

        def gh(command, **kwargs):
            if "list" in command:
                self.assertIn("success", command)
                self.assertIn("main", command)
                return subprocess.CompletedProcess(command, 0, '[{"databaseId": 42}]')
            self.assertIn("42", command)
            self.assertIn("frontend-build-performance", command)
            directory = command[command.index("--dir") + 1]
            (Path(directory) / "metrics.json").write_text(json.dumps(baseline))
            return subprocess.CompletedProcess(command, 0, "")

        with patch.dict(os.environ, {
            "GITHUB_ACTIONS": "true", "GITHUB_REPOSITORY": "owner/repo",
        }), patch("measure_build.subprocess.run", side_effect=gh):
            self.assertEqual(measure_build.download_baseline("frontend"), baseline)

    def test_missing_history_or_api_failure_is_nonfatal(self):
        for response in ["[]", "invalid", "[{}]"]:
            with patch.dict(os.environ, {
                "GITHUB_ACTIONS": "true", "GITHUB_REPOSITORY": "owner/repo",
            }), patch("measure_build.subprocess.run", return_value=
                      subprocess.CompletedProcess([], 0, response)):
                self.assertIsNone(measure_build.download_baseline("frontend"))
        with patch.dict(os.environ, {
            "GITHUB_ACTIONS": "true", "GITHUB_REPOSITORY": "owner/repo",
        }), patch("measure_build.subprocess.run", side_effect=OSError("API unavailable")):
            self.assertIsNone(measure_build.download_baseline("frontend"))

    def test_regression_warns_without_failing_successful_build(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "metrics.json"
            baseline = self.metrics()
            with patch("measure_build.download_baseline", return_value=baseline), \
                    patch("measure_build.time.perf_counter", side_effect=[0, 131]), \
                    patch("measure_build.subprocess.run", return_value=
                          subprocess.CompletedProcess([], 0)), \
                    patch.dict(os.environ, {"RUNNER_OS": "Linux", "RUNNER_ARCH": "X64"}), \
                    contextlib.redirect_stdout(io.StringIO()) as console:
                code = measure_build.measure("frontend", ["pnpm", "build"], output)
            self.assertEqual(code, 0)
            self.assertIn("::warning", console.getvalue())
            self.assertTrue(json.loads(output.read_text())["comparison"]["regression"])

    def test_artifact_download_failure_is_nonfatal(self):
        for error in [
            subprocess.CalledProcessError(1, ["gh"]),
            subprocess.TimeoutExpired(["gh"], 30),
        ]:
            with self.subTest(error=error), patch.dict(os.environ, {
                "GITHUB_ACTIONS": "true", "GITHUB_REPOSITORY": "owner/repo",
            }), patch("measure_build.subprocess.run", side_effect=[
                subprocess.CompletedProcess([], 0, '[{"databaseId": 42}]'), error,
            ]):
                self.assertIsNone(measure_build.download_baseline("frontend"))


if __name__ == "__main__":
    unittest.main()
