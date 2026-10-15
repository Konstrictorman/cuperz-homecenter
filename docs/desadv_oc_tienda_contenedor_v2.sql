/* =====================================================================
   DESADV - Box labels by store for one purchase order (v2)
   Same layout as the "Etiquetas por Tiendas" export (crossetiquetassiicuperzv1.xls):
   one row per box (paquete), ordered store -> box.
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
caja AS (                       -- one row per box (a mixed box can hold several lines)
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
    ROW_NUMBER() OVER (PARTITION BY c.EanTienda ORDER BY c.NumCaja)     AS paquete,     -- box n of the store
    COUNT(*)     OVER (PARTITION BY c.EanTienda)                        AS total,       -- boxes for the store
    SUBSTRING(e.SsccEtiqueta, 3, 18)                                    AS EanPaquete,  -- label SSCC without AI (00)
    CAST(c.NumCaja AS int)                                              AS NumPaquete,  -- box n of the order
    CAST(c.Unidades AS int)                                             AS cantpaquete, -- units in the box
    h.ID                                                                AS HDE_ID,
    doc.OC                                                              AS OrdenCompra,
    c.SsccCaja                                                          AS SsccCaja,
    c.SsccEstiba                                                        AS SsccEstiba
FROM caja c
JOIN doc                         ON doc.HDE_ID = c.HDE_ID
JOIN hde_hder_dcmnto_entrda h    ON h.ID = c.HDE_ID
LEFT JOIN etiqueta          e    ON e.HDE_ID = c.HDE_ID AND e.SsccCaja = c.SsccCaja AND e.rn = 1
LEFT JOIN mstro_lclzcnes    l    ON l.EAN = c.EanTienda
ORDER BY CAST(c.NumCaja AS int);
