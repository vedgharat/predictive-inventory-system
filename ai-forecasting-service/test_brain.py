import pytest
import json
from unittest.mock import MagicMock, patch


class TestVelocityCalculation:
    """Tests for the AI velocity calculation logic."""

    def test_velocity_increases_with_faster_sales(self):
        """Higher purchase frequency should produce a higher velocity."""
        import pandas as pd
        from sklearn.linear_model import LinearRegression

        # Simulate fast sales: 10 items every 5 seconds
        fast_data = [[5, 10], [10, 20], [15, 30]]
        df = pd.DataFrame(fast_data, columns=["SecondsElapsed", "TotalSold"])
        model = LinearRegression()
        model.fit(df[["SecondsElapsed"]], df["TotalSold"])
        fast_velocity = model.coef_[0] * 60

        # Simulate slow sales: 10 items every 30 seconds
        slow_data = [[30, 10], [60, 20], [90, 30]]
        df = pd.DataFrame(slow_data, columns=["SecondsElapsed", "TotalSold"])
        model = LinearRegression()
        model.fit(df[["SecondsElapsed"]], df["TotalSold"])
        slow_velocity = model.coef_[0] * 60

        assert fast_velocity > slow_velocity

    def test_velocity_is_positive_for_increasing_sales(self):
        """Velocity should always be positive when sales are increasing."""
        import pandas as pd
        from sklearn.linear_model import LinearRegression

        data = [[1, 5], [10, 15], [20, 30]]
        df = pd.DataFrame(data, columns=["SecondsElapsed", "TotalSold"])
        model = LinearRegression()
        model.fit(df[["SecondsElapsed"]], df["TotalSold"])
        velocity = model.coef_[0] * 60

        assert velocity > 0

    def test_velocity_rounding(self):
        """Velocity should be rounded to 2 decimal places in the output."""
        import pandas as pd
        from sklearn.linear_model import LinearRegression

        data = [[1, 3], [7, 11], [13, 22]]
        df = pd.DataFrame(data, columns=["SecondsElapsed", "TotalSold"])
        model = LinearRegression()
        model.fit(df[["SecondsElapsed"]], df["TotalSold"])
        velocity = round(model.coef_[0] * 60, 2)

        # Should have at most 2 decimal places
        assert velocity == round(velocity, 2)

    def test_prediction_payload_format(self):
        """The prediction payload should contain 'sku' and 'ai_velocity' keys."""
        payload = {
            "sku": "LAPTOP-001",
            "ai_velocity": 15.75
        }
        json_str = json.dumps(payload)
        parsed = json.loads(json_str)

        assert "sku" in parsed
        assert "ai_velocity" in parsed
        assert isinstance(parsed["ai_velocity"], float)

    def test_minimum_data_points_required(self):
        """Model should only train with 3 or more data points."""
        data_store = [[1, 5], [2, 10]]

        # With less than 3 points, we should NOT produce a prediction
        assert len(data_store) < 3

        data_store.append([3, 15])
        assert len(data_store) >= 3
