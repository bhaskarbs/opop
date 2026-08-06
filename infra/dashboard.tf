# A Cloud Monitoring dashboard — always created (unlike monitoring.tf's alert policies, this
# doesn't need alert_notification_email set; it's just a page in the console, nothing to notify).
# Free — dashboards themselves have no cost, only the underlying metrics they read, and those are
# already being collected automatically for Cloud Run/Cloud SQL whether or not anything looks at
# them. Complements, doesn't replace, monitoring.tf's alerts: this is for a human looking during
#/after an incident or before flipping a scale-up toggle; the alert policies are for a human
# finding out something needs attention in the first place.
#
# dashboard_json's shape (gridLayout, xyChart widgets, timeSeriesFilter syntax) was verified by
# actually creating this exact JSON as a real dashboard via `gcloud monitoring dashboards create`
# against the project, confirming it was accepted, then deleting it — not assumed from docs alone.
resource "google_monitoring_dashboard" "main" {
  dashboard_json = jsonencode({
    displayName = "OpenOpportunity"
    gridLayout = {
      columns = "2"
      widgets = [
        {
          title = "Backend request count by response class"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"openopportunity-backend\" AND metric.type = \"run.googleapis.com/request_count\""
                  aggregation = {
                    alignmentPeriod    = "300s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["metric.labels.response_code_class"]
                  }
                }
              }
              plotType = "STACKED_BAR"
            }]
            yAxis = { label = "requests/s", scale = "LINEAR" }
          }
        },
        {
          title = "Backend request latency (p50 / p95 / p99)"
          xyChart = {
            dataSets = [
              for p in ["50", "95", "99"] : {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"openopportunity-backend\" AND metric.type = \"run.googleapis.com/request_latencies\""
                    aggregation = {
                      alignmentPeriod  = "300s"
                      perSeriesAligner = "ALIGN_PERCENTILE_${p}"
                    }
                  }
                }
                plotType       = "LINE"
                legendTemplate = "p${p}"
              }
            ]
            yAxis = { label = "ms", scale = "LINEAR" }
          }
        },
        {
          title = "Backend CPU utilization"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"openopportunity-backend\" AND metric.type = \"run.googleapis.com/container/cpu/utilizations\""
                  aggregation = {
                    alignmentPeriod    = "300s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = { label = "utilization", scale = "LINEAR" }
          }
        },
        {
          title = "Backend memory utilization"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"openopportunity-backend\" AND metric.type = \"run.googleapis.com/container/memory/utilizations\""
                  aggregation = {
                    alignmentPeriod    = "300s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = { label = "utilization", scale = "LINEAR" }
          }
        },
        {
          title = "Backend instance count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"openopportunity-backend\" AND metric.type = \"run.googleapis.com/container/instance_count\""
                  aggregation = {
                    alignmentPeriod    = "300s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["metric.labels.state"]
                  }
                }
              }
              plotType = "STACKED_BAR"
            }]
            yAxis = { label = "instances", scale = "LINEAR" }
          }
        },
        {
          title = "Database CPU utilization"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
                  aggregation = {
                    alignmentPeriod  = "300s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = { label = "utilization", scale = "LINEAR" }
          }
        },
        {
          title = "Database memory utilization"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/memory/utilization\""
                  aggregation = {
                    alignmentPeriod  = "300s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = { label = "utilization", scale = "LINEAR" }
          }
        },
        {
          title = "Database active connections"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/network/connections\""
                  aggregation = {
                    alignmentPeriod  = "300s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = { label = "connections", scale = "LINEAR" }
          }
        }
      ]
    }
  })

  depends_on = [google_project_service.required]
}
