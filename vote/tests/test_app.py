import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app as vote_app


class VoteAppTestCase(unittest.TestCase):
    def setUp(self):
        vote_app.app.config['TESTING'] = True
        self.client = vote_app.app.test_client()

    def test_index_get_returns_200(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_index_contains_theme_toggle_button(self):
        response = self.client.get('/')
        html = response.data.decode('utf-8')
        self.assertIn('id="theme-toggle"', html)

    def test_index_contains_dark_class_toggle_script(self):
        response = self.client.get('/')
        html = response.data.decode('utf-8')
        self.assertIn("body.classList", html)
        self.assertIn("localStorage", html)

    def test_index_links_stylesheet(self):
        response = self.client.get('/')
        html = response.data.decode('utf-8')
        self.assertIn('style.css', html)

    def test_dark_css_contains_custom_properties(self):
        css_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'static', 'stylesheets', 'style.css'
        )
        with open(css_path) as f:
            css = f.read()
        self.assertIn('--bg-color', css)
        self.assertIn('body.dark', css)
        self.assertIn('#theme-toggle', css)

    def test_vote_form_exists(self):
        response = self.client.get('/')
        html = response.data.decode('utf-8')
        self.assertIn('<form', html)
        self.assertIn('name="vote"', html)

    @patch('app.get_redis')
    def test_post_vote_redirects(self, mock_get_redis):
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        response = self.client.post('/', data={'vote': 'a'})
        self.assertEqual(response.status_code, 200)
        mock_redis.rpush.assert_called_once()

    def test_option_a_rendered(self):
        response = self.client.get('/')
        html = response.data.decode('utf-8')
        self.assertIn(vote_app.option_a, html)

    def test_option_b_rendered(self):
        response = self.client.get('/')
        html = response.data.decode('utf-8')
        self.assertIn(vote_app.option_b, html)

    def test_default_option_a_is_modiin(self):
        self.assertEqual(vote_app.option_a, 'Modiin')

    def test_default_option_b_is_tel_aviv(self):
        self.assertEqual(vote_app.option_b, 'Tel Aviv')


if __name__ == '__main__':
    unittest.main()
