import base64
import math
import re
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

import requests
from django.conf import settings
from rest_framework.exceptions import APIException


class PaymentUnavailable(APIException):
    status_code = 503
    default_detail = 'Payment initiation is unavailable.'


@dataclass(frozen=True)
class InitiationOutcome:
    status: str
    error_code: str = ''
    merchant_request_id: str = ''
    checkout_request_id: str | None = None


class DarajaGateway:
    HOSTS = {'sandbox': 'https://sandbox.safaricom.co.ke', 'production': 'https://api.safaricom.co.ke'}

    def __init__(self):
        self.environment = settings.MPESA_ENVIRONMENT
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.passkey = settings.MPESA_PASSKEY
        self.shortcode = settings.MPESA_EXPRESS_SHORTCODE if self.environment == 'sandbox' else settings.MPESA_SHORTCODE
        self.callback_url = settings.MPESA_CALLBACK_URL
        self.timeout = (settings.MPESA_CONNECT_TIMEOUT, settings.MPESA_READ_TIMEOUT)

    def validate_configuration(self):
        if self.environment not in self.HOSTS:
            raise PaymentUnavailable()
        values = [self.consumer_key, self.consumer_secret, self.passkey, self.shortcode]
        if any(not isinstance(value, str) or not value.strip() or value.startswith('replace-with') for value in values):
            raise PaymentUnavailable()
        if not self.shortcode.isascii() or not self.shortcode.isdigit():
            raise PaymentUnavailable()
        try:
            url = urlsplit(self.callback_url)
            valid_url = url.scheme == 'https' and url.hostname and not url.username and not url.password and not url.fragment
            valid_timeouts = all(math.isfinite(value) and value > 0 for value in self.timeout)
        except (TypeError, ValueError):
            raise PaymentUnavailable()
        if not valid_url or not valid_timeouts:
            raise PaymentUnavailable()

    def initiate(self, attempt):
        host = self.HOSTS[self.environment]
        # No automatic retries. OAuth failures occur before any payment dispatch.
        try:
            response = requests.get(
                host + '/oauth/v1/generate?grant_type=client_credentials',
                auth=(self.consumer_key, self.consumer_secret), timeout=self.timeout, allow_redirects=False,
            )
            try:
                data = response.json()
                token = data.get('access_token') if isinstance(data, dict) else None
                if response.status_code != 200 or not isinstance(token, str) or not token:
                    return InitiationOutcome('rejected', 'oauth_failed')
            finally:
                response.close()
        except (requests.RequestException, ValueError):
            return InitiationOutcome('rejected', 'oauth_failed')

        timestamp = datetime.now(ZoneInfo('Africa/Nairobi')).strftime('%Y%m%d%H%M%S')
        password = base64.b64encode((self.shortcode + self.passkey + timestamp).encode()).decode()
        phone = attempt.phone.removeprefix('+')
        payload = {
            'BusinessShortCode': self.shortcode, 'Password': password, 'Timestamp': timestamp,
            'TransactionType': 'CustomerPayBillOnline', 'Amount': int(attempt.amount),
            'PartyA': phone, 'PartyB': self.shortcode, 'PhoneNumber': phone,
            'CallBackURL': self.callback_url, 'AccountReference': attempt.reference.hex[:12],
            'TransactionDesc': 'House plan',
        }
        try:
            response = requests.post(
                host + '/mpesa/stkpush/v1/processrequest', json=payload,
                headers={'Authorization': 'Bearer ' + token}, timeout=self.timeout, allow_redirects=False,
            )
            try:
                return self.parse_response(response.status_code, response.json())
            finally:
                response.close()
        except (requests.RequestException, ValueError):
            # The provider may have received the STK request even if our response was lost.
            return InitiationOutcome('unknown', 'dispatch_uncertain')

    def query_payment(self, checkout_request_id, merchant_request_id):
        self.validate_configuration()
        host = self.HOSTS[self.environment]
        try:
            response = requests.get(host + '/oauth/v1/generate?grant_type=client_credentials',
                auth=(self.consumer_key, self.consumer_secret), timeout=self.timeout, allow_redirects=False)
            try:
                data = response.json()
                token = data.get('access_token') if isinstance(data, dict) else None
                if response.status_code != 200 or not isinstance(token, str) or not token:
                    return None
            finally:
                response.close()
            timestamp = datetime.now(ZoneInfo('Africa/Nairobi')).strftime('%Y%m%d%H%M%S')
            password = base64.b64encode((self.shortcode + self.passkey + timestamp).encode()).decode()
            response = requests.post(host + '/mpesa/stkpushquery/v1/query', json={
                'BusinessShortCode': self.shortcode, 'Password': password,
                'Timestamp': timestamp, 'CheckoutRequestID': checkout_request_id,
            }, headers={'Authorization': 'Bearer ' + token}, timeout=self.timeout, allow_redirects=False)
            try:
                data = response.json()
                if response.status_code != 200 or not isinstance(data, dict):
                    return None
                if (str(data.get('ResponseCode')) != '0' or data.get('CheckoutRequestID') != checkout_request_id
                        or data.get('MerchantRequestID') != merchant_request_id):
                    return None
                code = data.get('ResultCode')
                if isinstance(code, bool) or not re.fullmatch(r'[0-9]{1,6}', str(code)):
                    return None
                code = int(code)
                # Unknown/processing codes are not proof of final failure.
                return code if code in {0, 1, 1032, 1037, 2001} else None
            finally:
                response.close()
        except (requests.RequestException, ValueError):
            return None

    @staticmethod
    def parse_response(http_status, data):
        if not isinstance(data, dict) or http_status >= 500 or 300 <= http_status < 400:
            return InitiationOutcome('unknown', 'invalid_provider_response')
        code = data.get('ResponseCode')
        merchant = data.get('MerchantRequestID')
        checkout = data.get('CheckoutRequestID')
        valid_ids = all(isinstance(value, str) and 0 < len(value) <= 128 and value.strip() == value
                        for value in [merchant, checkout])
        if 200 <= http_status < 300 and str(code) == '0' and valid_ids:
            return InitiationOutcome('pending', merchant_request_id=merchant, checkout_request_id=checkout)
        # Only an explicit rejection can release this order for another initiation.
        error = data.get('errorCode')
        if str(code) != '0' and (isinstance(error, str) and re.fullmatch(r'[A-Za-z0-9_.-]{1,64}', error)):
            return InitiationOutcome('rejected', error)
        if isinstance(code, (str, int)) and not isinstance(code, bool) and re.fullmatch(r'[1-9][0-9]{0,8}', str(code)):
            return InitiationOutcome('rejected', 'response_' + str(code))
        return InitiationOutcome('unknown', 'invalid_provider_response')
