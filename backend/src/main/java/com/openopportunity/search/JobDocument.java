package com.openopportunity.search;

import com.openopportunity.job.Job;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

/**
 * The Elasticsearch-side mirror of a Job — deliberately only the fields
 * ElasticsearchJobSearchProvider actually filters/searches/sorts on, not a full copy of Job.
 * Postgres stays the one source of truth for everything else (company logo URL, promoted-company
 * ranking, applicant count, ...): a search here returns matching ids, which JobService then
 * re-hydrates from JobRepository exactly as PostgresJobSearchProvider's results already are. See
 * JobIndexingService for how this gets kept in sync with the jobs table.
 */
@Document(indexName = "jobs")
public class JobDocument {

    @Id
    private final String id;

    @Field(type = FieldType.Text)
    private final String title;

    @Field(type = FieldType.Text)
    private final String companyName;

    @Field(type = FieldType.Text)
    private final String location;

    @Field(type = FieldType.Text)
    private final List<String> skills;

    // Keyword (not Text) on these three — exact-match filtering (status/level/mode), never
    // full-text search, so they must not be analyzer-tokenized.
    @Field(type = FieldType.Keyword)
    private final String status;

    @Field(type = FieldType.Keyword)
    private final String experienceLevel;

    @Field(type = FieldType.Keyword)
    private final String workMode;

    @Field(type = FieldType.Double)
    private final BigDecimal salaryMaxLakhs;

    @Field(type = FieldType.Date, format = DateFormat.date_optional_time)
    private final Instant createdAt;

    public JobDocument(
            String id,
            String title,
            String companyName,
            String location,
            List<String> skills,
            String status,
            String experienceLevel,
            String workMode,
            BigDecimal salaryMaxLakhs,
            Instant createdAt) {
        this.id = id;
        this.title = title;
        this.companyName = companyName;
        this.location = location;
        this.skills = skills;
        this.status = status;
        this.experienceLevel = experienceLevel;
        this.workMode = workMode;
        this.salaryMaxLakhs = salaryMaxLakhs;
        this.createdAt = createdAt;
    }

    static JobDocument from(Job job) {
        return new JobDocument(
                job.getId().toString(),
                job.getTitle(),
                job.getCompanyName(),
                job.getLocation(),
                job.getSkills(),
                job.getStatus().name(),
                job.getExperienceLevel().name(),
                job.getWorkMode().name(),
                job.getSalaryMaxLakhs(),
                job.getCreatedAt());
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getLocation() {
        return location;
    }

    public List<String> getSkills() {
        return skills;
    }

    public String getStatus() {
        return status;
    }

    public String getExperienceLevel() {
        return experienceLevel;
    }

    public String getWorkMode() {
        return workMode;
    }

    public BigDecimal getSalaryMaxLakhs() {
        return salaryMaxLakhs;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
