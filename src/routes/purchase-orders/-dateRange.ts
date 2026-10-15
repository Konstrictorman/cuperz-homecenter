const INVALID_RANGE = 'Debe ser posterior a la fecha desde'

/** Shared by both filter bars' "hasta" field: an end date on or before the
 *  start date is never a meaningful range (the backend answers `422`).
 *  Dates are the `YYYY-MM-DD` strings from `<input type="date">`, which
 *  compare correctly as plain strings. */
export const validateRangeOrder = (fechaDesde: string, fechaHasta: string) =>
  fechaDesde && fechaHasta && fechaHasta <= fechaDesde
    ? INVALID_RANGE
    : undefined
