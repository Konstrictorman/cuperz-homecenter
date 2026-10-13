#!/usr/bin/env python3
"""One-off build-time generator — NOT shipped to the browser, NOT run by the
app at request time. Supersedes `generate-purchase-order-dispatch-seed.py`
(MySQL version, now DEPRECATED) for the Orden→Tienda→Contenedor→Producto
tree: that data now comes from the legacy SQL Server DESADV database
(10.0.1.75, see CLAUDE.md) instead of the MySQL siicrossdocking
predistribution tables.

The query run per purchase order is the reviewed, read-only query in
docs/desadv_oc_tienda_contenedor.sql, with the hardcoded PO in its WHERE
clause turned into a bound parameter (TREE_QUERY below) — keep the two in
sync if that file's query changes.

`numPedido` has no equivalent in DESADV (it's a SIICUPERZ-internal id, not
part of the EDI data) — this script reuses the ordenCompra -> numPedido
mapping already present in the existing `purchase-order-dispatch-seed.json`
(originally MySQL-derived) rather than connecting to MySQL here too, per
the user's direction (confirmed 2026-10-09). Consequently, only purchase
orders already present in that file (i.e. ones that had a numPedido
assigned) are regenerated here; a PO with no numPedido still has to go
through the deprecated script at least once first.

For a purchase order with no DESADV document yet, or one whose document has
no confirmed dispatch date (FECH_DTM_11 / FechaDespacho), `estado` is
PENDIENTE and `fechaDespacho` is null — same rule shape as the deprecated
script, just keyed off DESADV's own dispatch-date field instead of
siipedidos.regpedidos.fechaenvio. The Orden→Tienda→Contenedor→Producto tree
itself is still populated whenever a DESADV document exists, even if not
yet confirmed dispatched — mirrors how the deprecated script built the tree
from predistribution data regardless of fechaenvio. As with the deprecated
script, there's no `CON_ERROR` here either: nothing in this query signals a
Homecenter rejection, only whether/when DESADV recorded a dispatch.

Credentials are read from the environment (see .env.local, git-ignored) —
never hardcoded here, per CLAUDE.md's instruction to keep legacy DB
passwords out of this repo.

Requires the pure-Python `python-tds` package (no FreeTDS/ODBC needed):
    pip install --user python-tds

Re-run with: python3 scripts/generate-purchase-order-dispatch-seed-desadv.py
(only needed if the DESADV data changes materially, or the existing seed's
ordenCompra/numPedido list is regenerated from a newer export).
"""

import json
import os
from pathlib import Path

import pytds

ROOT = Path(__file__).resolve().parent.parent
SEED_JSON = ROOT / "src/mocks/data/purchase-order-dispatch-seed.json"
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
    return pytds.connect(
        dsn=os.environ["HC_LEGACY_MSSQL_HOST"],
        port=int(os.environ.get("HC_LEGACY_MSSQL_PORT", "1433")),
        database=os.environ.get("HC_LEGACY_MSSQL_DATABASE", "DESADV"),
        user=os.environ["HC_LEGACY_MSSQL_USER"],
        password=os.environ["HC_LEGACY_MSSQL_PASSWORD"],
        timeout=15,
        login_timeout=15,
        autocommit=True,
        as_dict=True,
    )


# docs/desadv_oc_tienda_contenedor.sql, verbatim, with the hardcoded PO in
# the `doc` CTE's WHERE clause replaced by a %s parameter.
TREE_QUERY = """
WITH doc AS (
    SELECT TOP 1 d.HDE_ID, d.DOCMNT_REFRNC_1154_ON AS OC
    FROM dde_dtail_dcmnto_entrda d
    JOIN hde_hder_dcmnto_entrda h ON h.ID = d.HDE_ID
    WHERE d.DOCMNT_REFRNC_1154_ON = %s
    ORDER BY d.HDE_ID DESC
)
SELECT
    doc.OC                                                  AS OrdenCompra,
    h.ID                                                    AS HDE_ID,
    CONVERT(char(10), h.HDE_FCHACRGUE, 23)                  AS FechaPedido,
    CONVERT(char(10), h.FECH_2380_17, 23)                   AS FechaEntrega,
    CONVERT(char(10), h.FECH_DTM_11, 23)                    AS FechaDespacho,
    RTRIM(h.NAD_CODG_3039_DP)                               AS EanPuntoEntrega,
    pe.DSCRCION                                             AS PuntoEntrega,
    REPLACE(lt.CODINT, 'T', '')                             AS CodigoTienda,
    RTRIM(d.PNTO_VNTA)                                      AS EanTienda,
    d.PNTO_VNTA_DSCRPCION                                   AS NombreTienda,
    RTRIM(d.DDE_CDGOSRIALESTBA)                             AS SsccEstiba,
    RTRIM(d.DDE_CDGOSRIALCJA)                               AS SsccCaja,
    d.DDE_IDNTFCCIONEMPQUE                                  AS NumCaja,
    d.DDE_CLSEEMPQUE                                        AS ClaseEmpaque,
    d.DDE_ID_INTRNO_LIN                                     AS CodigoFactory,
    RTRIM(d.IDNTFCCN_ITM_7140_EN)                           AS EanProducto,
    d.DDE_DSCRPCION_LIN                                     AS Descripcion,
    d.CANTDD_6060_21                                        AS CantidadOrden,
    d.CANTDD_6060_59                                        AS CantidadDespachada,
    d.CANTDD_6060_21 - d.CANTDD_6060_59                     AS CantidadNoEnviada,
    d.DDE_PESO                                              AS Peso,
    d.DDE_VOLUMEN                                           AS Volumen,
    d.DOCMNT_REFRNC_1154_IB                                 AS Factura,
    CONVERT(char(10), d.FECHA_FACT, 23)                     AS FechaFactura
FROM doc
JOIN hde_hder_dcmnto_entrda  h  ON h.ID = doc.HDE_ID
JOIN dde_dtail_dcmnto_entrda d  ON d.HDE_ID = doc.HDE_ID
                               AND d.DOCMNT_REFRNC_1154_ON = doc.OC
LEFT JOIN mstro_lclzcnes     lt ON lt.EAN = d.PNTO_VNTA
LEFT JOIN mstro_lclzcnes     pe ON pe.EAN = h.NAD_CODG_3039_DP
ORDER BY d.PNTO_VNTA_DSCRPCION, d.DDE_CDGOSRIALESTBA, d.DDE_CDGOSRIALCJA, d.DDE_RNGLON
"""


def to_number(value):
    if value is None:
        return None
    f = float(value)
    return int(f) if f.is_integer() else f


def build_tree(rows):
    """Assemble one PO's Tienda -> Contenedor -> Producto tree from DESADV
    detail lines. `SsccEstiba` (the pallet SSCC) is the `contenedor` —
    the same role `eanstiba` played in the deprecated MySQL script.
    CantidadDespachada/Peso/Volumen are summed across detail lines that
    share the same (pallet, product), since one SKU can span several box
    lines (DDE_RNGLON) on the same pallet. Returns
    (eanPuntoEntrega, fechaDespacho, tiendas)."""
    ean_punto_entrega = None
    fecha_despacho = None
    stores: dict[str, dict] = {}

    for row in rows:
        ean_punto_entrega = ean_punto_entrega or row["EanPuntoEntrega"]
        fecha_despacho = fecha_despacho or row["FechaDespacho"]

        store = stores.setdefault(
            row["EanTienda"], {"eanTienda": row["EanTienda"], "contenedores": {}}
        )
        container = store["contenedores"].setdefault(
            row["SsccEstiba"], {"contenedor": row["SsccEstiba"], "productos": {}}
        )
        product = container["productos"].setdefault(
            row["EanProducto"],
            {"eanSku": row["EanProducto"], "cantidad": 0, "peso": 0.0, "volumen": 0.0},
        )
        product["cantidad"] += to_number(row["CantidadDespachada"]) or 0
        product["peso"] += to_number(row["Peso"]) or 0
        product["volumen"] += to_number(row["Volumen"]) or 0

    tiendas = [
        {
            "eanTienda": store["eanTienda"],
            "contenedores": [
                {
                    "contenedor": container["contenedor"],
                    "productos": [
                        {
                            "eanSku": product["eanSku"],
                            "cantidad": to_number(product["cantidad"]),
                            "peso": round(product["peso"], 2),
                            "volumen": round(product["volumen"], 4),
                        }
                        for product in container["productos"].values()
                    ],
                }
                for container in store["contenedores"].values()
            ],
        }
        for store in stores.values()
    ]
    return ean_punto_entrega, fecha_despacho, tiendas


def main() -> None:
    load_env_local()
    existing_seed = json.loads(SEED_JSON.read_text())

    conn = connect()
    cur = conn.cursor()

    seed = []
    no_desadv_document = []
    not_yet_dispatched = []
    for entry in existing_seed:
        orden_compra = entry["ordenCompra"]
        num_pedido = entry["numPedido"]

        cur.execute(TREE_QUERY, (orden_compra,))
        rows = cur.fetchall()

        if not rows:
            no_desadv_document.append(orden_compra)
            # Best-effort placeholder: no DESADV document for this PO yet,
            # so fall back to whatever eanPuntoEntrega the previous
            # (MySQL-derived) seed had rather than losing it outright.
            seed.append(
                {
                    "eanPuntoEntrega": entry.get("eanPuntoEntrega"),
                    "ordenCompra": orden_compra,
                    "numPedido": num_pedido,
                    "estado": "PENDIENTE",
                    "fechaDespacho": None,
                    "tiendas": [],
                }
            )
            continue

        ean_punto_entrega, fecha_despacho, tiendas = build_tree(rows)
        if not fecha_despacho:
            not_yet_dispatched.append(orden_compra)

        seed.append(
            {
                "eanPuntoEntrega": ean_punto_entrega,
                "ordenCompra": orden_compra,
                "numPedido": num_pedido,
                "estado": "DESPACHADA" if fecha_despacho else "PENDIENTE",
                "fechaDespacho": fecha_despacho,
                "tiendas": tiendas,
            }
        )

    conn.close()

    seed.sort(key=lambda o: o["ordenCompra"])
    SEED_JSON.write_text(f"{json.dumps(seed, indent=2, ensure_ascii=False)}\n")

    print(
        f"Wrote {len(seed)} purchase-order-dispatch records "
        f"({sum(1 for o in seed if o['estado'] == 'DESPACHADA')} DESPACHADA, "
        f"{sum(1 for o in seed if o['estado'] == 'PENDIENTE')} PENDIENTE) "
        f"to {SEED_JSON.relative_to(ROOT)}"
    )
    if no_desadv_document:
        print(
            f"{len(no_desadv_document)} orden(es) have no DESADV document at "
            f"all yet: {', '.join(no_desadv_document)}"
        )
    if not_yet_dispatched:
        print(
            f"{len(not_yet_dispatched)} orden(es) have a DESADV document but "
            f"no confirmed dispatch date (FECH_DTM_11): "
            f"{', '.join(not_yet_dispatched)}"
        )


if __name__ == "__main__":
    main()
