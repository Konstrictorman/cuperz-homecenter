#!/usr/bin/env python3
"""One-off build-time generator — NOT shipped to the browser, NOT run by the
app at request time. Queries the legacy SIICUPERZ MySQL databases
(10.0.1.72, see CLAUDE.md) for the real Cross-Docking predistribution data
(container/product/weight/volume breakdown) behind the purchase orders
already seeded in `purchase-orders-seed.json` — i.e. the same 67
Cross-Docking orders parsed from
`docs/Reporte Ordenes de Compra_1791316031156.xlsx` — and writes the result
to `src/mocks/data/purchase-order-dispatch-seed.json`, which the
Purchase-Order-Dispatch-Status mock handlers (src/mocks/handlers/
purchase-order-dispatch.ts) load as static, read-only reference data.

This is real production data read, not Homecenter's contract — it backs a
platform-only view (numPedido-keyed PO dispatch status) that has no formal
backend spec yet, confirmed directly with the user (2026-10-07). See
src/api/purchase-order-dispatch.ts's doc comment for the endpoint pair this
feeds.

Credentials are read from the environment (see .env.local, git-ignored) —
never hardcoded here, per CLAUDE.md's instruction to keep the legacy DB
password out of this repo.

Re-run with: python3 scripts/generate-purchase-order-dispatch-seed.py
(only needed if the legacy data changes materially, or the source seed list
in purchase-orders-seed.json is regenerated from a newer export).
"""

import json
import os
import re
from pathlib import Path

import pymysql

ROOT = Path(__file__).resolve().parent.parent
PURCHASE_ORDERS_SEED = ROOT / "src/mocks/data/purchase-orders-seed.json"
OUTPUT_JSON = ROOT / "src/mocks/data/purchase-order-dispatch-seed.json"
ENV_LOCAL = ROOT / ".env.local"


def load_env_local() -> None:
    """Minimal `.env.local` loader (no python-dotenv dependency) — only
    fills vars not already set in the real environment."""
    if not ENV_LOCAL.exists():
        return
    for line in ENV_LOCAL.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.split("#", 1)[0].strip()
        if key and key not in os.environ:
            os.environ[key] = value


def connect():
    return pymysql.connect(
        host=os.environ["HC_LEGACY_MYSQL_HOST"],
        port=int(os.environ.get("HC_LEGACY_MYSQL_PORT", "3306")),
        user=os.environ["HC_LEGACY_MYSQL_USER"],
        password=os.environ["HC_LEGACY_MYSQL_PASSWORD"],
        connect_timeout=8,
        cursorclass=pymysql.cursors.DictCursor,
    )


# `fechaenvio` reads back as this sentinel when never set (MySQL zero-date
# surfacing through the driver) — same shape as `STICKER`'s `"-1"` sentinel
# elsewhere in this codebase's mock data (see src/mocks/data/db.ts).
FECHA_ENVIO_SENTINEL = "1969-12-31"


def to_number(value):
    if value is None:
        return None
    f = float(value)
    return int(f) if f.is_integer() else f


def main() -> None:
    load_env_local()
    orders = json.loads(PURCHASE_ORDERS_SEED.read_text())
    ordenes_compra = [o["ordenCompra"] for o in orders]

    conn = connect()
    cur = conn.cursor()

    placeholders = ",".join(["%s"] * len(ordenes_compra))
    cur.execute(
        f"""
        SELECT id AS idpedido, ordencompra, numpedido,
               CAST(fechaenvio AS CHAR) AS fechaenvio
        FROM siipedidos.regpedidos
        WHERE ordencompra IN ({placeholders})
        """,
        ordenes_compra,
    )
    reg_rows = cur.fetchall()

    ids = [r["idpedido"] for r in reg_rows]
    id_placeholders = ",".join(["%s"] * len(ids)) if ids else "NULL"
    cur.execute(
        f"""
        SELECT
            p.idpedido      AS idPedido,
            rp.ordencompra  AS ordenCompra,
            pe.ean          AS eanPuntoEntrega,
            t.eantienda     AS eanTienda,
            p.eanstiba      AS contenedor,
            d.eanproducto   AS eanSku,
            SUM(d.cantemb)  AS cantidad,
            ROUND(SUM(p.peso    * d.cantemb / p.cantpaquete), 2) AS peso,
            ROUND(SUM(p.volumen * d.cantemb / p.cantpaquete), 4) AS volumen
        FROM siicrossdocking.paquetesxtiendas p
        JOIN siicrossdocking.paquetedeta d
              ON d.idpedido = p.idpedido AND d.idtienda = p.idtienda
              AND d.npaquete = p.npaquete
        JOIN (SELECT idpedido, idtienda, MAX(eantienda) AS eantienda
               FROM siicrossdocking.pedidosxtiendas
               GROUP BY idpedido, idtienda) t
              ON t.idpedido = p.idpedido AND t.idtienda = p.idtienda
        JOIN siipedidos.regpedidos rp     ON rp.id = p.idpedido
        JOIN siipedidos.equiptoentrega pe ON pe.id = rp.identrega
        WHERE p.cerrar = 'S'
          AND p.eanstiba <> ''
          AND p.idpedido IN ({id_placeholders})
        GROUP BY p.idpedido, pe.ean, rp.ordencompra, t.eantienda, p.eanstiba, d.eanproducto
        ORDER BY rp.ordencompra, t.eantienda, p.eanstiba, d.eanproducto
        """,
        ids,
    )
    tree_rows = cur.fetchall()
    conn.close()

    # --- Assemble the Orden -> Tienda -> Contenedor -> Producto tree ---
    by_order: dict[str, dict] = {}
    for row in tree_rows:
        order = by_order.setdefault(
            row["ordenCompra"],
            {"eanPuntoEntrega": row["eanPuntoEntrega"], "tiendas": {}},
        )
        store = order["tiendas"].setdefault(
            row["eanTienda"], {"eanTienda": row["eanTienda"], "contenedores": {}}
        )
        container = store["contenedores"].setdefault(
            row["contenedor"], {"contenedor": row["contenedor"], "productos": []}
        )
        container["productos"].append(
            {
                "eanSku": row["eanSku"],
                "cantidad": to_number(row["cantidad"]),
                "peso": to_number(row["peso"]),
                "volumen": to_number(row["volumen"]),
            }
        )

    def tiendas_list(order_tree: dict) -> list:
        return [
            {
                "eanTienda": store["eanTienda"],
                "contenedores": list(store["contenedores"].values()),
            }
            for store in order_tree["tiendas"].values()
        ]

    seed = []
    skipped_no_num_pedido = []
    for reg in reg_rows:
        num_pedido = (reg["numpedido"] or "").strip()
        if not num_pedido:
            skipped_no_num_pedido.append(reg["ordencompra"])
            continue

        fecha_envio = reg["fechaenvio"]
        fecha_despacho = (
            fecha_envio
            if fecha_envio and fecha_envio != FECHA_ENVIO_SENTINEL
            else None
        )

        order_tree = by_order.get(reg["ordencompra"])
        tiendas = tiendas_list(order_tree) if order_tree else []

        seed.append(
            {
                "eanPuntoEntrega": order_tree["eanPuntoEntrega"] if order_tree else None,
                "ordenCompra": reg["ordencompra"],
                "numPedido": num_pedido,
                # No `CON_ERROR` here: nothing in the legacy schema signals a
                # Homecenter rejection — only whether SIICUPERZ recorded a
                # real `fechaenvio`. See the api module's doc comment.
                "estado": "DESPACHADA" if fecha_despacho else "PENDIENTE",
                "fechaDespacho": fecha_despacho,
                "tiendas": tiendas,
            }
        )

    seed.sort(key=lambda o: o["ordenCompra"])
    OUTPUT_JSON.write_text(f"{json.dumps(seed, indent=2, ensure_ascii=False)}\n")

    print(
        f"Wrote {len(seed)} purchase-order-dispatch records "
        f"({sum(1 for o in seed if o['estado'] == 'DESPACHADA')} DESPACHADA, "
        f"{sum(1 for o in seed if o['estado'] == 'PENDIENTE')} PENDIENTE) "
        f"to {OUTPUT_JSON.relative_to(ROOT)}"
    )
    if skipped_no_num_pedido:
        print(
            f"Skipped {len(skipped_no_num_pedido)} orden(es) with no numpedido "
            f"in regpedidos: {', '.join(skipped_no_num_pedido)}"
        )
    missing = set(ordenes_compra) - {r["ordencompra"] for r in reg_rows}
    if missing:
        print(
            f"{len(missing)} orden(es) from the xlsx have no regpedidos row at "
            f"all (not yet predistributed in Cross-Docking): {', '.join(sorted(missing))}"
        )


if __name__ == "__main__":
    main()
