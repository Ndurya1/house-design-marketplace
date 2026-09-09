from django.conf import settings
from django.core import signing


CHECKOUT_TOKEN_SALT = 'orders.checkout.payment.v1'


def issue_checkout_token(order):
    return signing.dumps({'order': str(order.reference), 'purpose': 'payment'}, salt=CHECKOUT_TOKEN_SALT)


def validate_checkout_token(token, order):
    if not token or len(token) > 2048:
        return False
    try:
        payload = signing.loads(token, salt=CHECKOUT_TOKEN_SALT, max_age=settings.CHECKOUT_TOKEN_MAX_AGE)
    except (signing.BadSignature, ValueError, TypeError):
        return False
    return payload == {'order': str(order.reference), 'purpose': 'payment'}


SESSION_SALT = 'orders.checkout.session.v1'
DOWNLOAD_SALT = 'orders.download.v1'


def issue_session_token(order):
    return signing.dumps({'order': str(order.reference), 'purpose': 'checkout_session'}, salt=SESSION_SALT)


def valid_scoped_token(token, payload, salt, max_age):
    if not token or len(token) > 2048:
        return False
    try:
        return signing.loads(token, salt=salt, max_age=max_age) == payload
    except (signing.BadSignature, ValueError, TypeError):
        return False


def validate_session_token(token, order):
    return valid_scoped_token(token, {'order': str(order.reference), 'purpose': 'checkout_session'},
                              SESSION_SALT, settings.CHECKOUT_SESSION_MAX_AGE)


def issue_download_token(grant):
    return signing.dumps({'grant': str(grant.reference), 'purpose': 'download'}, salt=DOWNLOAD_SALT)


def validate_download_token(token, grant):
    return valid_scoped_token(token, {'grant': str(grant.reference), 'purpose': 'download'},
                              DOWNLOAD_SALT, settings.DOWNLOAD_TOKEN_MAX_AGE)
