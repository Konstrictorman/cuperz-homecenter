/* =====================================================================
   DESADV - Box labels by store for one purchase order (v2)
   Same layout as the "Etiquetas por Tiendas" export (crossetiquetassiicuperzv1.xls):
   one row per box (paquete) and product, ordered store -> box -> product.
   Box columns (Peso, Volumen, cantpaquete, paquete, total) are box totals and
   repeat if a box holds several SKUs; *Sku columns are per product.
   Since HDE_ID 2300 every box holds exactly one SKU, so rows = boxes.
   SQL Server (DESADV on 10.0.1.75). Plain SELECT, read-only.
   Change the PO number in the WHERE clause of the "doc" CTE.

   Differences from the xls
     DirTienda   mstro_lclzcnes.DRCCION is an abbreviated address (max 35 chars)
     RegPedido   siipedidos register number is not in DESADV; HDE_ID and
                 OrdenCompra are returned instead

   EanPaquete is the printed label SSCC. The DESADV box SSCC (DDE_CDGOSRIALCJA)
   is a different number; rel_cse_sest maps it: cse_prodcto = box SSCC,
   cse_lin = label SSCC.
   ===================================================================== */
WITH doc AS (
    SELECT TOP 1 d.HDE_ID, d.DOCMNT_REFRNC_1154_ON AS OC
    FROM dde_dtail_dcmnto_entrda d
    JOIN hde_hder_dcmnto_entrda h ON h.ID = d.HDE_ID
    WHERE d.DOCMNT_REFRNC_1154_ON = '16130755'          -- <== purchase order
    ORDER BY d.HDE_ID DESC
),
linea AS (                      -- one row per box + SKU
    SELECT  d.HDE_ID,
            RTRIM(d.PNTO_VNTA)                   AS EanTienda,
            RTRIM(d.DDE_CDGOSRIALCJA)            AS SsccCaja,
            RTRIM(d.IDNTFCCN_ITM_7140_EN)        AS EanSku,
            MAX(RTRIM(d.DDE_ID_INTRNO_LIN))      AS CodigoFactory,
            MAX(d.DDE_DSCRPCION_LIN)             AS DescripcionSku,
            SUM(d.CANTDD_6060_59)                AS CantidadSku,
            SUM(d.DDE_PESO)                      AS PesoSku,
            SUM(d.DDE_VOLUMEN)                   AS VolumenSku,
            MIN(d.DDE_RNGLON)                    AS Renglon
    FROM doc
    JOIN dde_dtail_dcmnto_entrda d ON d.HDE_ID = doc.HDE_ID
                                  AND d.DOCMNT_REFRNC_1154_ON = doc.OC
    GROUP BY d.HDE_ID, RTRIM(d.PNTO_VNTA), RTRIM(d.DDE_CDGOSRIALCJA), RTRIM(d.IDNTFCCN_ITM_7140_EN)
),
caja AS (                       -- one row per box, with its position in the store
    SELECT  c.*,
            ROW_NUMBER() OVER (PARTITION BY c.EanTienda ORDER BY c.NumCaja) AS paquete,
            COUNT(*)     OVER (PARTITION BY c.EanTienda)                    AS total
    FROM (
        SELECT  d.HDE_ID,
                RTRIM(d.PNTO_VNTA)                   AS EanTienda,
                MAX(d.PNTO_VNTA_DSCRPCION)           AS Nomtienda,
                RTRIM(d.DDE_CDGOSRIALCJA)            AS SsccCaja,
                MAX(RTRIM(d.DDE_CDGOSRIALESTBA))     AS SsccEstiba,
                MIN(d.DDE_IDNTFCCIONEMPQUE)          AS NumCaja,
                SUM(d.DDE_PESO)                      AS Peso,
                SUM(d.DDE_VOLUMEN)                   AS Volumen,
                SUM(d.CANTDD_6060_59)                AS Unidades
        FROM doc
        JOIN dde_dtail_dcmnto_entrda d ON d.HDE_ID = doc.HDE_ID
                                      AND d.DOCMNT_REFRNC_1154_ON = doc.OC
        GROUP BY d.HDE_ID, RTRIM(d.PNTO_VNTA), RTRIM(d.DDE_CDGOSRIALCJA)
    ) c
),
etiqueta AS (                   -- label SSCC per box SSCC (latest if reprinted)
    SELECT r.HDE_ID, RTRIM(r.cse_prodcto) AS SsccCaja, RTRIM(r.cse_lin) AS SsccEtiqueta,
           ROW_NUMBER() OVER (PARTITION BY r.HDE_ID, RTRIM(r.cse_prodcto) ORDER BY r.cod_rel DESC) AS rn
    FROM doc
    JOIN rel_cse_sest r ON r.HDE_ID = doc.HDE_ID
)
SELECT
    c.EanTienda                                                         AS EanTienda,
    l.CODINT                                                            AS CodTienda,
    c.Nomtienda                                                         AS Nomtienda,
    l.DRCCION                                                           AS DirTienda,
    c.Peso                                                              AS Peso,
    c.Volumen                                                           AS Volumen,
    h.NAD_DSCRPCION_SU                                                  AS Proveedor,
    c.paquete                                                           AS paquete,     -- box n of the store
    c.total                                                             AS total,       -- boxes for the store
    SUBSTRING(e.SsccEtiqueta, 3, 18)                                    AS EanPaquete,  -- label SSCC without AI (00)
    CAST(c.NumCaja AS int)                                              AS NumPaquete,  -- box n of the order
    CAST(c.Unidades AS int)                                             AS cantpaquete, -- units in the box
    li.EanSku                                                           AS EanSku,
    li.CodigoFactory                                                    AS CodigoFactory,
    li.DescripcionSku                                                   AS DescripcionSku,
    CAST(li.CantidadSku AS int)                                         AS CantidadSku,
    li.PesoSku                                                          AS PesoSku,
    li.VolumenSku                                                       AS VolumenSku,
    h.ID                                                                AS HDE_ID,
    doc.OC                                                              AS OrdenCompra,
    RTRIM(h.NAD_CODG_3039_DP)                                           AS EanPuntoEntrega,
    pe.DSCRCION                                                         AS PuntoEntrega,
    c.SsccCaja                                                          AS SsccCaja,
    c.SsccEstiba                                                        AS SsccEstiba
FROM caja c
JOIN linea                  li   ON li.HDE_ID = c.HDE_ID AND li.EanTienda = c.EanTienda AND li.SsccCaja = c.SsccCaja
JOIN doc                         ON doc.HDE_ID = c.HDE_ID
JOIN hde_hder_dcmnto_entrda h    ON h.ID = c.HDE_ID
LEFT JOIN etiqueta          e    ON e.HDE_ID = c.HDE_ID AND e.SsccCaja = c.SsccCaja AND e.rn = 1
LEFT JOIN mstro_lclzcnes    l    ON l.EAN = c.EanTienda
LEFT JOIN mstro_lclzcnes    pe   ON pe.EAN = h.NAD_CODG_3039_DP          -- delivery point name
ORDER BY CAST(c.NumCaja AS int), li.Renglon;
