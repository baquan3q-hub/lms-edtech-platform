import unittest
from metrics import compute_metrics
from worker import event_scope, retry_delay, InvalidEvent


class MetricsTest(unittest.TestCase):
    def test_missing_data_is_not_a_zero_score(self):
        result = compute_metrics({})
        self.assertIsNone(result["published_score_average"])
        self.assertIsNone(result["homework_completion_rate"])
        self.assertEqual(result["support_signals"], [])

    def test_rates_have_explicit_denominators(self):
        result = compute_metrics({"assigned_count":4,"submitted_count":2,"on_time_count":1})
        self.assertEqual(result["homework_completion_rate"],50)
        self.assertEqual(result["homework_on_time_rate"],50)

    def test_support_requires_evidence_and_sufficient_samples(self):
        self.assertEqual(compute_metrics({"published_scores":[2]})["support_signals"],[])
        result=compute_metrics({"published_scores":[2,3],"unexcused_absences":3})
        self.assertEqual(len(result["support_signals"]),2)
        self.assertEqual(result["support_signals"][1]["sample_size"],2)

    def test_bad_data_is_flagged_and_invalid_scores_are_excluded(self):
        result=compute_metrics({"assigned_count":1,"submitted_count":2,"published_scores":[None,float('nan'),20,8]})
        self.assertEqual(result["data_quality"],"review_required")
        self.assertEqual(result["published_score_average"],8)

    def test_unsupported_events_fail_closed(self):
        with self.assertRaises(InvalidEvent):
            event_scope({"schema_version":2})
        with self.assertRaises(InvalidEvent):
            event_scope({"schema_version":1,"school_id":"invalid","payload":{}})

    def test_backoff_is_bounded(self):
        self.assertEqual(retry_delay(1),5)
        self.assertEqual(retry_delay(3),20)
        self.assertEqual(retry_delay(100),300)


if __name__ == "__main__":
    unittest.main()
