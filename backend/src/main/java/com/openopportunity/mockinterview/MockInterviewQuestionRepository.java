package com.openopportunity.mockinterview;

import com.openopportunity.job.ExperienceLevel;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MockInterviewQuestionRepository extends JpaRepository<MockInterviewQuestion, UUID> {

    /** Candidate-facing matching: industry/experienceLevel are treated as wildcards on either
     * side (a null on the question OR a null in the request both count as a match) since neither
     * is guaranteed to be filled in on a candidate's profile — see
     * MockInterviewQuestionService.matchingQuestions, which layers the skill-overlap filter on
     * top of this in Java (Postgres array-overlap isn't expressible in JPQL). */
    @Query("select q from MockInterviewQuestion q where "
            + "(:industry is null or q.industry is null or q.industry = :industry) "
            + "and (:experienceLevel is null or q.experienceLevel is null or q.experienceLevel = :experienceLevel)")
    List<MockInterviewQuestion> findByOptionalFilters(
            @Param("industry") String industry, @Param("experienceLevel") ExperienceLevel experienceLevel);

    boolean existsByTextIgnoreCase(String text);

    List<MockInterviewQuestion> findAllByOrderByCreatedAtDesc();
}
