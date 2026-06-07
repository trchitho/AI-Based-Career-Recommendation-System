import urllib.parse

from app.modules.payment.vnpay_service import VNPayService


def _service() -> VNPayService:
    return VNPayService(
        tmn_code="ABCD1234",
        hash_secret="sandbox-secret",
        return_url="https://backend.example/api/payment/vnpay/return",
    )


def test_create_payment_url_contains_required_vnpay_210_fields():
    result = _service().create_payment_url(
        amount=10000,
        order_id="ORDER_1",
        order_info="Thanh toán gói Pro!",
        ip_addr="127.0.0.1",
    )

    assert result["success"] is True
    params = urllib.parse.parse_qs(urllib.parse.urlparse(result["payment_url"]).query)
    assert params["vnp_Version"] == ["2.1.0"]
    assert params["vnp_Amount"] == ["1000000"]
    assert params["vnp_OrderInfo"] == ["Thanh toan goi Pro"]
    assert len(params["vnp_CreateDate"][0]) == 14
    assert len(params["vnp_ExpireDate"][0]) == 14
    assert params["vnp_ReturnUrl"] == ["https://backend.example/api/payment/vnpay/return"]
    assert "vnp_SecureHash" in params


def test_invalid_terminal_is_rejected_before_redirect():
    service = VNPayService(
        tmn_code="invalid",
        hash_secret="sandbox-secret",
        return_url="https://backend.example/api/payment/vnpay/return",
    )

    result = service.create_payment_url(
        amount=10000,
        order_id="ORDER_1",
        order_info="Test",
    )

    assert result["success"] is False
    assert "VNPAY_TMN_CODE" in result["message"]


def test_verify_return_reports_signature_validity():
    service = _service()
    created = service.create_payment_url(
        amount=10000,
        order_id="ORDER_2",
        order_info="Test",
    )
    params = dict(
        urllib.parse.parse_qsl(
            urllib.parse.urlparse(created["payment_url"]).query
        )
    )
    params["vnp_ResponseCode"] = "00"
    params["vnp_TransactionStatus"] = "00"

    invalid = service.verify_return(params)

    assert invalid["success"] is False
    assert invalid["valid_signature"] is False
