from flask import Flask, render_template, request, make_response, g, redirect, url_for
from redis import Redis
import os
import socket
import random
import json
import logging

default_option_a = os.getenv('OPTION_A', "USA")
default_option_b = os.getenv('OPTION_B', "France")
hostname = socket.gethostname()

app = Flask(__name__)

gunicorn_error_logger = logging.getLogger('gunicorn.error')
app.logger.handlers.extend(gunicorn_error_logger.handlers)
app.logger.setLevel(logging.INFO)

def get_redis():
    if not hasattr(g, 'redis'):
        g.redis = Redis(host="redis", db=0, socket_timeout=5)
    return g.redis

def get_labels():
    try:
        redis = get_redis()
        a = redis.get('option_a')
        b = redis.get('option_b')
        option_a = a.decode('utf-8') if a else default_option_a
        option_b = b.decode('utf-8') if b else default_option_b
    except Exception:
        option_a = default_option_a
        option_b = default_option_b
    return option_a, option_b

@app.route("/", methods=['POST','GET'])
def hello():
    voter_id = request.cookies.get('voter_id')
    if not voter_id:
        voter_id = hex(random.getrandbits(64))[2:-1]

    option_a, option_b = get_labels()
    vote = None

    if request.method == 'POST':
        redis = get_redis()
        vote = request.form['vote']
        app.logger.info('Received vote for %s', vote)
        data = json.dumps({'voter_id': voter_id, 'vote': vote})
        redis.rpush('votes', data)

    resp = make_response(render_template(
        'index.html',
        option_a=option_a,
        option_b=option_b,
        hostname=hostname,
        vote=vote,
    ))
    resp.set_cookie('voter_id', voter_id)
    return resp

@app.route("/settings", methods=['GET', 'POST'])
def settings():
    option_a, option_b = get_labels()
    saved = False

    if request.method == 'POST':
        new_a = request.form.get('option_a', '').strip()
        new_b = request.form.get('option_b', '').strip()
        if new_a and new_b:
            redis = get_redis()
            redis.set('option_a', new_a)
            redis.set('option_b', new_b)
            option_a, option_b = new_a, new_b
            saved = True
            app.logger.info('Labels updated to: %s vs %s', option_a, option_b)

    return render_template(
        'settings.html',
        option_a=option_a,
        option_b=option_b,
        saved=saved,
    )


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=True, threaded=True)
