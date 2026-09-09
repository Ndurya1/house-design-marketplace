# Run from backend/plan on Linux with the deployment environment loaded.
bind = '127.0.0.1:8000'
workers = 2
threads = 2
timeout = 120
graceful_timeout = 120
errorlog = '-'
# Keep headers and query strings containing user data out of access logs.
accesslog = None
