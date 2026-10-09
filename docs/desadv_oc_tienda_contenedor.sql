/* =====================================================================
   DESADV - Products by container by store for one purchase order
   Plain SELECT (no stored procedure). Read-only.
   Change the PO number in the WHERE clause of the "doc" CTE.

   One row per detail line, ordered store -> pallet -> box -> line.
   The latest document is used if the PO was loaded more than once.
   Prices are not stored in DESADV (PRI_AAA / PRI_AAB / MONTO_TOTAL are empty).
   ===================================================================== */
WITH doc AS (
    SELECT TOP 1 d.HDE_ID, d.DOCMNT_REFRNC_1154_ON AS OC
    FROM dde_dtail_dcmnto_entrda d
    JOIN hde_hder_dcmnto_entrda h ON h.ID = d.HDE_ID
    WHERE d.DOCMNT_REFRNC_1154_ON = '16130755'          -- <== purchase order
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
    d.DDE_CLSEEMPQUE                                        AS ClaseEmpaque,      -- M = mixta, E = un solo producto
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
LEFT JOIN mstro_lclzcnes     lt ON lt.EAN = d.PNTO_VNTA            -- store code
LEFT JOIN mstro_lclzcnes     pe ON pe.EAN = h.NAD_CODG_3039_DP     -- delivery point name
ORDER BY d.PNTO_VNTA_DSCRPCION, d.DDE_CDGOSRIALESTBA, d.DDE_CDGOSRIALCJA, d.DDE_RNGLON;
