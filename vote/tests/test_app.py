"""Tests for vote app — settings page and dynamic label logic."""
import json
import unittest
from unittest.mock import patch, MagicMock


class FakeRedis:
    """In-memory Redis stub for testing."""

    def __init__(self):
        self._store = {}

    def get(self, key):
        val = self._store.get(key)
        return val.encode('utf-8') if isinstance(val, str) else val

    def set(self, key, value):
        self._store[key] = value

    def rpush(self, key, value):
        self._store.setdefault(key, []).append(value)


def make_app(fake_redis=None):
    """Import the Flask app with a patched Redis connection."""
    import importlib, sys
    # Remove cached module so env-var defaults are re-read
    sys.modules.pop('app', None)

    if fake_redis is None:
        fake_redis = FakeRedis()

    with patch('redis.Redis', return_value=fake_redis):
        import app as vote_app
        vote_app.app.config['TESTING'] = True
        vote_app.app.config['SECRET_KEY'] = 'test'
        # Patch get_redis at module level so every request uses our fake
        vote_app.get_redis = lambda: fake_redis
        return vote_app.app, fake_redis


class TestSettingsPage(unittest.TestCase):

    def setUp(self):
        self.flask_app, self.fake_redis = make_app()
        self.client = self.flask_app.test_client()

    # ------------------------------------------------------------------
    # Settings GET
    # ------------------------------------------------------------------

    def test_settings_get_returns_200(self):
        resp = self.client.get('/settings')
        self.assertEqual(resp.status_code, 200)

    def test_settings_get_shows_default_labels(self):
        resp = self.client.get('/settings')
        data = resp.data.decode()
        self.assertIn('USA', data)
        self.assertIn('France', data)

    def test_settings_get_shows_redis_labels_when_set(self):
        self.fake_redis.set('option_a', 'Dogs')
        self.fake_redis.set('option_b', 'Cats')
        resp = self.client.get('/settings')
        data = resp.data.decode()
        self.assertIn('Dogs', data)
        self.assertIn('Cats', data)

    # ------------------------------------------------------------------
    # Settings POST
    # ------------------------------------------------------------------

    def test_settings_post_saves_labels_to_redis(self):
        resp = self.client.post('/settings', data={'option_a': 'Pizza', 'option_b': 'Tacos'})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.fake_redis.get('option_a'), b'Pizza')
        self.assertEqual(self.fake_redis.get('option_b'), b'Tacos')

    def test_settings_post_shows_saved_confirmation(self):
        resp = self.client.post('/settings', data={'option_a': 'Dogs', 'option_b': 'Cats'})
        data = resp.data.decode()
        self.assertIn('saved', data.lower())

    def test_settings_post_empty_labels_not_saved(self):
        self.fake_redis.set('option_a', 'Original')
        resp = self.client.post('/settings', data={'option_a': '', 'option_b': ''})
        # Empty labels should not overwrite existing value
        self.assertEqual(self.fake_redis.get('option_a'), b'Original')

    # ------------------------------------------------------------------
    # Dynamic labels on the voting page
    # ------------------------------------------------------------------

    def test_vote_page_uses_redis_labels(self):
        self.fake_redis.set('option_a', 'Ice Cream')
        self.fake_redis.set('option_b', 'Cake')
        resp = self.client.get('/')
        data = resp.data.decode()
        self.assertIn('Ice Cream', data)
        self.assertIn('Cake', data)

    def test_vote_page_falls_back_to_defaults_when_redis_missing(self):
        # Redis has no labels set
        resp = self.client.get('/')
        data = resp.data.decode()
        self.assertIn('USA', data)
        self.assertIn('France', data)

    # ------------------------------------------------------------------
    # Settings link on vote page
    # ------------------------------------------------------------------

    def test_vote_page_has_settings_link(self):
        resp = self.client.get('/')
        self.assertIn(b'/settings', resp.data)


class TestGetLabelsHelper(unittest.TestCase):
    """Unit tests for the get_labels() helper."""

    def test_returns_redis_values_when_present(self):
        fake_redis = FakeRedis()
        fake_redis.set('option_a', 'Alpha')
        fake_redis.set('option_b', 'Beta')

        flask_app, _ = make_app(fake_redis)
        import app as vote_app
        vote_app.get_redis = lambda: fake_redis

        with flask_app.app_context():
            a, b = vote_app.get_labels()
        self.assertEqual(a, 'Alpha')
        self.assertEqual(b, 'Beta')

    def test_returns_defaults_when_redis_empty(self):
        fake_redis = FakeRedis()
        flask_app, _ = make_app(fake_redis)
        import app as vote_app
        vote_app.get_redis = lambda: fake_redis

        with flask_app.app_context():
            a, b = vote_app.get_labels()
        self.assertEqual(a, vote_app.default_option_a)
        self.assertEqual(b, vote_app.default_option_b)

    def test_returns_defaults_when_redis_raises(self):
        def boom():
            raise ConnectionError("Redis unavailable")

        flask_app, _ = make_app()
        import app as vote_app
        vote_app.get_redis = boom

        with flask_app.app_context():
            a, b = vote_app.get_labels()
        self.assertEqual(a, vote_app.default_option_a)
        self.assertEqual(b, vote_app.default_option_b)


if __name__ == '__main__':
    unittest.main()
