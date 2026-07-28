package com.openopportunity.admin.dto;

/** One calendar month's worth of the "Applications by path" chart — {@code month} is the
 * first day of that month (UTC), ISO-formatted (e.g. "2026-07-01"), for the frontend to derive
 * a locale-appropriate axis label from. */
public record MonthlyApplicationsByPath(String month, long jobs, long partnerships, long community) {}
