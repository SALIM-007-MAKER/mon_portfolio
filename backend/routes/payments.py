import json
import time
from datetime import datetime
from urllib import error as url_error
from urllib import parse as url_parse
from urllib import request as url_request

from flask import Blueprint, current_app, jsonify, request

from extensions import db
from models import MenuItem, Order, OrderItem
from utils.auth import (
    ROLE_ADMIN,
    ROLE_CLIENT,
    ROLE_SERVER,
    ROLE_STAFF,
    get_current_identity,
    login_required,
    role_required,
)

bp = Blueprint("payments", __name__, url_prefix="/api/payments")


def _can_access_order(identity, order):
    role = identity.get("role")
    return role in [ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER] or order.user_id == identity.get("id")


def _http_json(method, url, headers=None, payload=None):
    body = None
    request_headers = headers or {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        request_headers = {**request_headers, "Content-Type": "application/json"}
    req = url_request.Request(url, data=body, method=method, headers=request_headers)
    try:
        with url_request.urlopen(req, timeout=20) as response:
            content = response.read().decode("utf-8")
            if not content:
                return {}
            return json.loads(content)
    except url_error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        raise ValueError(raw or f"HTTP {exc.code}") from exc
    except url_error.URLError as exc:
        raise ValueError("Connexion au fournisseur de paiement impossible.") from exc


def _build_order_from_items_payload(order, items_payload):
    if not items_payload:
        return jsonify({"message": "Aucun article dans la commande."}), 400
    aggregated = {}
    for row in items_payload:
        try:
            menu_item_id = int(row.get("menu_item_id"))
            quantity = int(row.get("quantity", 1))
        except (TypeError, ValueError):
            continue
        if quantity < 1:
            continue
        aggregated[menu_item_id] = aggregated.get(menu_item_id, 0) + quantity
    if not aggregated:
        return jsonify({"message": "Aucun article valide dans la commande."}), 400
    menu_items = {item.id: item for item in MenuItem.query.filter(MenuItem.id.in_(aggregated.keys())).all()}
    order.items = []
    for menu_item_id, quantity in aggregated.items():
        menu_item = menu_items.get(menu_item_id)
        if not menu_item:
            continue
        order.items.append(
            OrderItem(order=order, menu_item=menu_item, quantity=quantity, unit_price=menu_item.price)
        )
    if not order.items:
        return jsonify({"message": "Aucun article valide dans la commande."}), 400
    return None, None


def _validate_and_apply_stock(order):
    for item in order.items:
        if item.menu_item.stock < item.quantity:
            return (
                jsonify({"message": f"Stock insuffisant pour {item.menu_item.name}. Paiement non finalisé."}),
                409,
            )
    for item in order.items:
        item.menu_item.stock -= item.quantity
    order.status = "en_preparation"
    order.validated_at = datetime.utcnow()
    return None, None


def _stripe_checkout(order, email):
    secret_key = current_app.config.get("STRIPE_SECRET_KEY", "").strip()
    if not secret_key:
        return None, jsonify({"message": "Stripe non configuré côté serveur."}), 400
    base_url = current_app.config.get("PUBLIC_BASE_URL", "").rstrip("/")
    if not base_url:
        return None, jsonify({"message": "PUBLIC_BASE_URL non configuré."}), 500

    line_items = []
    for index, item in enumerate(order.items):
        line_items.extend(
            [
                (f"line_items[{index}][quantity]", str(item.quantity)),
                (f"line_items[{index}][price_data][currency]", "xof"),
                (
                    f"line_items[{index}][price_data][product_data][name]",
                    item.menu_item.name,
                ),
                (f"line_items[{index}][price_data][unit_amount]", str(int(round(item.unit_price)))),
            ]
        )

    payload = [
        ("mode", "payment"),
        ("success_url", f"{base_url}/dashboard?payment=success&payment_provider=stripe&order_id={order.id}&session_id={{CHECKOUT_SESSION_ID}}"),
        ("cancel_url", f"{base_url}/dashboard?payment=cancelled&payment_provider=stripe&order_id={order.id}"),
        ("client_reference_id", str(order.id)),
        ("metadata[order_id]", str(order.id)),
        ("customer_email", email),
        *line_items,
    ]
    req = url_request.Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=url_parse.urlencode(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        with url_request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
            checkout_url = data.get("url")
            session_id = data.get("id")
            if not checkout_url:
                return None, jsonify({"message": "Réponse Stripe invalide."}), 502
            return {"checkout_url": checkout_url, "external_reference": session_id}, None, None
    except url_error.HTTPError as exc:
        return None, jsonify({"message": f"Erreur Stripe ({exc.code})."}), 502
    except url_error.URLError:
        return None, jsonify({"message": "Connexion Stripe impossible."}), 502


def _flutterwave_checkout(order, user_name, email):
    secret_key = current_app.config.get("FLUTTERWAVE_SECRET_KEY", "").strip()
    if not secret_key:
        return None, jsonify({"message": "Flutterwave non configuré côté serveur."}), 400
    base_url = current_app.config.get("PUBLIC_BASE_URL", "").rstrip("/")
    if not base_url:
        return None, jsonify({"message": "PUBLIC_BASE_URL non configuré."}), 500

    tx_ref = f"order-{order.id}-{int(time.time())}"
    payload = {
        "tx_ref": tx_ref,
        "amount": int(round(order.total())),
        "currency": "XOF",
        "redirect_url": f"{base_url}/dashboard?payment_provider=flutterwave&order_id={order.id}",
        "customer": {"email": email, "name": user_name or "Client"},
        "customizations": {
            "title": "Sahel Kitchen",
            "description": f"Paiement commande #{order.id}",
        },
    }
    try:
        data = _http_json(
            "POST",
            "https://api.flutterwave.com/v3/payments",
            headers={"Authorization": f"Bearer {secret_key}"},
            payload=payload,
        )
        link = (data.get("data") or {}).get("link")
        if not link:
            return None, jsonify({"message": "Réponse Flutterwave invalide."}), 502
        return {"checkout_url": link, "external_reference": tx_ref}, None, None
    except ValueError:
        return None, jsonify({"message": "Erreur Flutterwave."}), 502


@bp.get("/providers")
@login_required
def list_payment_providers():
    stripe_enabled = bool(current_app.config.get("STRIPE_SECRET_KEY", "").strip())
    flutterwave_enabled = bool(current_app.config.get("FLUTTERWAVE_SECRET_KEY", "").strip())
    return jsonify(
        {
            "providers": {
                "stripe": {"enabled": stripe_enabled},
                "flutterwave": {"enabled": flutterwave_enabled},
            }
        }
    )


@bp.post("/checkout")
@login_required
@role_required(ROLE_CLIENT, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def create_checkout():
    identity = get_current_identity()
    data = request.get_json() or {}
    provider = (data.get("provider") or "").strip().lower()
    items = data.get("items", [])
    customer_email = (data.get("email") or "").strip()
    customer_name = (data.get("name") or "").strip()

    if provider not in ["stripe", "flutterwave"]:
        return jsonify({"message": "Fournisseur de paiement invalide."}), 400
    if not customer_email:
        return jsonify({"message": "Email client requis pour le paiement."}), 400

    order = Order(
        user_id=identity["id"],
        status="draft",
        payment_provider=provider,
        payment_status="pending",
    )
    db.session.add(order)
    error_response, status_code = _build_order_from_items_payload(order, items)
    if error_response:
        db.session.rollback()
        return error_response, status_code
    db.session.flush()

    if provider == "stripe":
        provider_result, provider_error, provider_status = _stripe_checkout(order, customer_email)
    else:
        provider_result, provider_error, provider_status = _flutterwave_checkout(order, customer_name, customer_email)
    if provider_error:
        db.session.rollback()
        return provider_error, provider_status

    order.payment_reference = provider_result.get("external_reference")
    db.session.commit()
    return jsonify(
        {
            "order_id": order.id,
            "provider": provider,
            "checkout_url": provider_result.get("checkout_url"),
        }
    )


@bp.post("/verify")
@login_required
@role_required(ROLE_CLIENT, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def verify_payment():
    identity = get_current_identity()
    data = request.get_json() or {}
    try:
        order_id = int(data.get("order_id"))
    except (TypeError, ValueError):
        return jsonify({"message": "order_id invalide."}), 400

    order = Order.query.get_or_404(order_id)
    if not _can_access_order(identity, order):
        return jsonify({"message": "Accès refusé."}), 403
    if order.payment_provider not in ["stripe", "flutterwave"]:
        return jsonify({"message": "Cette commande n'utilise pas un paiement en ligne."}), 400

    if order.payment_status == "paid":
        return jsonify(order.to_dict())

    if order.payment_provider == "stripe":
        secret_key = current_app.config.get("STRIPE_SECRET_KEY", "").strip()
        if not secret_key:
            return jsonify({"message": "Stripe non configuré côté serveur."}), 400
        session_id = (data.get("session_id") or "").strip()
        if not session_id:
            return jsonify({"message": "session_id Stripe requis."}), 400
        try:
            stripe_data = _http_json(
                "GET",
                f"https://api.stripe.com/v1/checkout/sessions/{url_parse.quote(session_id)}",
                headers={"Authorization": f"Bearer {secret_key}"},
            )
        except ValueError:
            return jsonify({"message": "Impossible de vérifier le paiement Stripe."}), 502
        payment_status = stripe_data.get("payment_status")
        if payment_status != "paid":
            order.payment_status = "failed" if payment_status in ["canceled", "unpaid"] else "pending"
            db.session.commit()
            return jsonify({"message": "Paiement Stripe non validé.", "order": order.to_dict()}), 400
        order.payment_reference = session_id
    else:
        secret_key = current_app.config.get("FLUTTERWAVE_SECRET_KEY", "").strip()
        if not secret_key:
            return jsonify({"message": "Flutterwave non configuré côté serveur."}), 400
        transaction_id = str(data.get("transaction_id") or "").strip()
        if not transaction_id:
            return jsonify({"message": "transaction_id Flutterwave requis."}), 400
        try:
            flutter_data = _http_json(
                "GET",
                f"https://api.flutterwave.com/v3/transactions/{url_parse.quote(transaction_id)}/verify",
                headers={"Authorization": f"Bearer {secret_key}"},
            )
        except ValueError:
            return jsonify({"message": "Impossible de vérifier le paiement Flutterwave."}), 502
        tx_data = flutter_data.get("data") or {}
        if tx_data.get("status") != "successful":
            order.payment_status = "failed"
            db.session.commit()
            return jsonify({"message": "Paiement Flutterwave non validé.", "order": order.to_dict()}), 400
        order.payment_reference = str(tx_data.get("id") or transaction_id)

    stock_error, stock_status = _validate_and_apply_stock(order)
    if stock_error:
        order.payment_status = "failed"
        db.session.commit()
        return stock_error, stock_status

    order.payment_status = "paid"
    db.session.commit()
    return jsonify(order.to_dict())
